export function generateStaticParams() {
  return [
    { id: 'demo-nano', meetingId: 'demo-meet-nano-1' },
    { id: 'demo-miyavi', meetingId: 'demo-meet-miyavi-1' },
    { id: 'demo-miyavi', meetingId: 'demo-meet-miyavi-2' },
    { id: 'demo-miyavi', meetingId: 'demo-meet-miyavi-3' },
    { id: 'demo-miyavi', meetingId: 'demo-meet-miyavi-4' },
  ];
}

export default function MeetingDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
