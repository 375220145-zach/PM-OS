// Excel知识库导入器 — 确定性解析列结构，LLM 只做关系增强
// Uses SheetJS (xlsx) for browser-side Excel parsing

import * as XLSX from 'xlsx';
import { db } from '@/db/database';
import { buildNodeId, normalizeLabel } from './types';
import { upsertNodes, upsertEdges, upsertImage, removeNodesBySource, removeEdgesByProject } from './store';
import type { GraphNode, GraphEdge, GraphEntityType, GraphSourceType, KbImageRecord } from '@/types';
import { generateId, now } from '@/lib/utils';

// DISPIMG ID → image filename mapping (extracted from Excel cellimages.xml)
const DISPIMG_MAP: Record<string, string> = {
  ID_1D14DDDA6E1147A7A83993E425C1A03C: '/kb-images/image1.png',  // ABS
  ID_A0FE31C43D6746328EE7F588593B0721: '/kb-images/image2.png',  // 波峰焊
  ID_2339DFE4EE0A4D75A40F6B1D939B4626: '/kb-images/image3.png',  // 回流焊
  ID_FBA8900710AA4EB48E6A760867FF178A: '/kb-images/image4.png',  // 铣削
  ID_F09D8717C2A44B2787C72B51C05F9523: '/kb-images/image5.png',  // 车削
  ID_4793CDBA03864FD59C5A05A97E5849C2: '/kb-images/image6.png',  // 18650&软包锂电
  ID_3CF1995E1CC04569BD25617175C8949A: '/kb-images/image7.png',  // 18650&软包锂电
};

function extractImagePath(rawValue: string): string | null {
  const match = rawValue.match(/_xlfn\.DISPIMG\("(ID_[^"]+)"/);
  if (match && DISPIMG_MAP[match[1]]) {
    return DISPIMG_MAP[match[1]];
  }
  return null;
}

export interface ExcelImportResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  images: KbImageRecord[];
  errors: string[];
}

interface ExcelRow {
  rowNum: number;
  category1: string;      // 一级类目
  category2: string;      // 二级类目
  term: string;           // 名词
  content: string;        // 详细内容
  notes: string;          // 备注
}

/**
 * Parse an Excel file into graph nodes and edges.
 * @param file - The uploaded .xlsx File object
 * @param imageMap - Optional map of row_number → base64 image data (pre-extracted)
 * @param persist - If true, write directly to IndexedDB (default true)
 */
export async function importExcelToGraph(
  file: File,
  imageMap?: Map<number, { base64: string; mimeType: string }>,
  persist = true,
): Promise<ExcelImportResult> {
  const errors: string[] = [];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const images: KbImageRecord[] = [];

  // 1. Read Excel file
  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch {
    return { nodes: [], edges: [], images: [], errors: ['无法读取 Excel 文件，请确认格式为 .xlsx'] };
  }

  const sheetName = workbook.SheetNames.find(s => s === '知识库') || workbook.SheetNames[0];
  if (!sheetName) {
    return { nodes: [], edges: [], images: [], errors: ['Excel 文件中没有可用的 sheet'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  const rows = rawRows.map(r => r.map(c => String(c ?? ''))) as string[][];

  // 2. Parse header row to detect column positions
  if (rows.length < 2) {
    return { nodes: [], edges: [], images: [], errors: ['Excel 文件为空或只有表头'] };
  }

  const header = rows[0].map(h => h.trim());
  const colIndex: Record<string, number> = {};
  for (let i = 0; i < header.length; i++) {
    colIndex[header[i]] = i;
  }

  // Validate expected columns exist
  const expectedCols = ['一级类目', '二级类目', '名词', '详细内容'];
  for (const col of expectedCols) {
    if (!(col in colIndex)) {
      errors.push(`缺少预期列: ${col}`);
    }
  }
  if (errors.length > 0) {
    return { nodes: [], edges: [], images: [], errors };
  }

  const SOURCE: GraphSourceType = 'kb';
  const categoryNodes = new Map<string, string>(); // label → nodeId
  let conceptCount = 0;

  // 3. Parse each data row (skip header)
  for (let i = 1; i < rows.length; i++) {
    const rawRow = rows[i] as string[];
    if (!rawRow || rawRow.every(c => !c)) continue; // skip empty rows

    const clean = (v: string) => v
      .replace(/=_xlfn\.DISPIMG\("ID_[^"]*",\d+\)/g, '')
      .replace(/[^\S\n]+/g, ' ')   // collapse horizontal whitespace only, preserve newlines
      .replace(/\n{3,}/g, '\n\n')  // max 2 consecutive newlines
      .trim();

    // Extract image path from any cell in this row that contains DISPIMG
    let imagePath: string | null = null;
    for (const rawVal of rawRow) {
      const s = String(rawVal || '');
      const img = extractImagePath(s);
      if (img) { imagePath = img; break; }
    }

    const row: ExcelRow = {
      rowNum: i + 1,
      category1: clean(String(rawRow[colIndex['一级类目']] || '')),
      category2: clean(String(rawRow[colIndex['二级类目']] || '')),
      term: clean(String(rawRow[colIndex['名词']] || '')),
      content: clean(String(rawRow[colIndex['详细内容']] || '')),
      notes: colIndex['备注'] !== undefined ? clean(String(rawRow[colIndex['备注']] || '')) : '',
    };

    if (!row.term && !row.content) continue; // skip completely empty rows

    // Build category nodes (if not already created)
    const catIds: string[] = [];
    if (row.category1) {
      const id = buildNodeId(SOURCE, 'category', row.category1);
      if (!categoryNodes.has(row.category1)) {
        categoryNodes.set(row.category1, id);
        nodes.push({
          id,
          entityType: 'category',
          source: SOURCE,
          label: row.category1,
          normalizedLabel: normalizeLabel(row.category1),
          properties: { level: 1 },
          createdAt: now(),
          updatedAt: now(),
        });
      }
      catIds.push(id);
    }
    if (row.category2) {
      const id = buildNodeId(SOURCE, 'category', row.category2);
      if (!categoryNodes.has(row.category2)) {
        categoryNodes.set(row.category2, id);
        nodes.push({
          id,
          entityType: 'category',
          source: SOURCE,
          label: row.category2,
          normalizedLabel: normalizeLabel(row.category2),
          properties: { level: 2, parentCategory: row.category1 || undefined },
          createdAt: now(),
          updatedAt: now(),
        });
      }
      catIds.push(id);
    }

    // Build concept node
    const conceptLabel = row.term || row.content.slice(0, 30);
    if (!conceptLabel) continue;

    const conceptId = buildNodeId(SOURCE, 'concept', conceptLabel);
    conceptCount++;
    nodes.push({
      id: conceptId,
      entityType: 'concept',
      source: SOURCE,
      label: conceptLabel,
      normalizedLabel: normalizeLabel(conceptLabel),
      properties: {
        content: row.content,
        notes: row.notes,
        category1: row.category1,
        category2: row.category2,
        rowNum: row.rowNum,
        ...(imagePath ? { imagePath } : {}),
        ...parseContentForEntities(row.content),
      },
      createdAt: now(),
      updatedAt: now(),
    });

    // belongs_to edges: concept → subcategory → category
    if (catIds.length >= 2) {
      edges.push({
        id: `${SOURCE}--belongs_to--${conceptId.slice(0, 12)}--${catIds[1].slice(0, 12)}`,
        sourceId: conceptId,
        targetId: catIds[1],
        relation: 'belongs_to',
        weight: 1,
        properties: {},
        createdAt: now(),
      });
      // subcategory → category
      edges.push({
        id: `${SOURCE}--belongs_to--${catIds[1].slice(0, 12)}--${catIds[0].slice(0, 12)}`,
        sourceId: catIds[1],
        targetId: catIds[0],
        relation: 'belongs_to',
        weight: 1,
        properties: {},
        createdAt: now(),
      });
    } else if (catIds.length === 1) {
      edges.push({
        id: `${SOURCE}--belongs_to--${conceptId.slice(0, 12)}--${catIds[0].slice(0, 12)}`,
        sourceId: conceptId,
        targetId: catIds[0],
        relation: 'belongs_to',
        weight: 1,
        properties: {},
        createdAt: now(),
      });
    }

    // Handle images
    if (imageMap?.has(row.rowNum)) {
      const img = imageMap.get(row.rowNum)!;
      images.push({
        id: `kb-image--${conceptId}`,
        nodeId: conceptId,
        base64: img.base64,
        mimeType: img.mimeType,
        createdAt: now(),
      });
      // has_image edge
      edges.push({
        id: `${SOURCE}--has_image--${conceptId.slice(0, 12)}`,
        sourceId: conceptId,
        targetId: conceptId,  // self-referencing, image is a property
        relation: 'has_image',
        weight: 1,
        properties: { imageId: `kb-image--${conceptId}` },
        createdAt: now(),
      });
    }
  }

  // 4. Persist if requested
  if (persist) {
    // Clear old kb data first
    await removeNodesBySource(SOURCE);
    // Clear kb edges (they don't have a source field, so we clear all and re-import project data later)
    // For now, just clear all kb-related edges by checking if sourceId starts with 'kb--'
    const allEdges = await db.graphEdges.toArray();
    const kbEdges = allEdges.filter(e => e.id.startsWith('kb--'));
    for (const e of kbEdges) {
      await db.graphEdges.delete(e.id);
    }

    await upsertNodes(nodes);
    await upsertEdges(edges);
    for (const img of images) {
      await upsertImage(img);
    }
  }

  return { nodes, edges, images, errors };
}

/**
 * Parse content text for entity mentions (material names, supplier names, risk types).
 * This is the deterministic pre-pass — LLM enhancement comes in extraction.ts.
 */
function parseContentForEntities(content: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Look for supplier mentions (common patterns in the knowledge base)
  const supplierPatterns = [/供应商[：:]\s*([^\n，。]+)/, /厂家[：:]\s*([^\n，。]+)/];
  for (const pattern of supplierPatterns) {
    const match = content.match(pattern);
    if (match) {
      props.mentionedSupplier = match[1].trim();
      break;
    }
  }

  // Look for cost/price mentions
  const costMatch = content.match(/[¥￥]\s*(\d+[\.\d]*)/);
  if (costMatch) {
    props.mentionedCost = parseFloat(costMatch[1]);
  }

  return props;
}

/**
 * Extract images from Excel and return as base64 map (row → base64).
 * This is a utility for pre-processing; the actual extraction is done via a Python script.
 * The browser cannot extract DISPIMG embedded images from Excel.
 */
export async function loadPreExtractedImages(imageDirUrl: string, rowMap: Map<string, number>): Promise<Map<number, { base64: string; mimeType: string }>> {
  const result = new Map<number, { base64: string; mimeType: string }>();

  // Try to load pre-extracted images by row number
  // Images are expected to be named like "row_27.png" in the image directory
  for (const [filename, rowNum] of rowMap) {
    try {
      const response = await fetch(`${imageDirUrl}/${filename}`);
      if (!response.ok) continue;
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      result.set(rowNum, { base64, mimeType: blob.type || 'image/png' });
    } catch {
      // Image not found, skip
    }
  }

  return result;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Get total concept count for the kb source */
export async function getKbStats(): Promise<{ conceptCount: number; categoryCount: number; imageCount: number }> {
  const allNodes = await db.graphNodes.toArray();
  const kbNodes = allNodes.filter(n => n.source === 'kb');
  return {
    conceptCount: kbNodes.filter(n => n.entityType === 'concept').length,
    categoryCount: kbNodes.filter(n => n.entityType === 'category').length,
    imageCount: await db.kbImages.count(),
  };
}
