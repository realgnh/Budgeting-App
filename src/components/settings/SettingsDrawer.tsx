import { useUi, type SettingsSection } from '../../store/useUi';
import { Drawer } from '../common/Overlay';
import { SegmentedControl } from '../common/SegmentedControl';
import { BudgetEditor } from './BudgetEditor';
import { CategoryEditor } from './CategoryEditor';
import { DataControls } from './DataControls';

export function SettingsDrawer() {
  const { settings, closeSettings, openSettings } = useUi();
  return (
    <Drawer open={settings.open} onClose={closeSettings} title="Settings & Data">
      <SegmentedControl<SettingsSection> ariaLabel="Settings section" value={settings.section} onChange={(s) => openSettings(s)}
        options={[{ value: 'budgets', label: 'Budgets' }, { value: 'categories', label: 'Categories' }, { value: 'data', label: 'Data' }]} />
      <div key={settings.section} className="anim-fade-up flex flex-col gap-6">
        {settings.section === 'budgets' && <BudgetEditor />}
        {settings.section === 'categories' && <CategoryEditor />}
        {settings.section === 'data' && <DataControls />}
      </div>
    </Drawer>
  );
}
