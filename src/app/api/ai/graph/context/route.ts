export const dynamic = 'force-static';

export async function GET() {
  return Response.json({ context: { crossProjectEntities: [], relatedNodes: [], summary: 'Demo 模式不支持图谱检索。完整版请访问 Vercel 部署。' } });
}

export async function POST() {
  return Response.json({ context: { crossProjectEntities: [], relatedNodes: [], summary: 'Demo 模式不支持图谱检索。完整版请访问 Vercel 部署。' } });
}
