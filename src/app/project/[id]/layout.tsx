export function generateStaticParams() {
  return [
    { id: 'demo-nano' },
    { id: 'demo-miyavi' },
  ];
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
