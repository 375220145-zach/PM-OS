import Button from './Button';
import Icon, { type IconName } from './Icon';

interface Props {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = 'clipboard-list', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon name={icon} size={40} stroke={1} className="text-gray-700 mb-4" />
      <h3 className="text-lg font-medium text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-md">{description}</p>}
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
