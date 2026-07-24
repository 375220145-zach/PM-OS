export function generateStaticParams() {
  return [
    { id: 'demo-miyavi', retroId: 'demo-retro-2' },
  ];
}

export default function RetroDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
