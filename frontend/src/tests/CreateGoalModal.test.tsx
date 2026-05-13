import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateGoalModal from '../components/CreateGoalModal';

describe('CreateGoalModal', () => {
  function renderModal(overrides: Partial<React.ComponentProps<typeof CreateGoalModal>> = {}) {
    const defaultProps: React.ComponentProps<typeof CreateGoalModal> = {
      open: true,
      profileId: 'profile-1',
      onClose: vi.fn(),
      onSubmit: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
    const utils = render(<CreateGoalModal {...defaultProps} />);
    return { ...utils, props: defaultProps };
  }

  it('does not render anything when open is false', () => {
    render(
      <CreateGoalModal
        open={false}
        profileId="profile-1"
        onClose={() => {}}
        onSubmit={async () => {}}
      />,
    );
    expect(screen.queryByTestId('create-goal-modal')).not.toBeInTheDocument();
  });

  it('renders the modal dialog when open', () => {
    renderModal();
    expect(screen.getByTestId('create-goal-modal')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows a validation error when the title is empty', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Save Goal' }));

    expect(await screen.findByTestId('goal-modal-error')).toHaveTextContent(/title is required/i);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('shows a validation error when targetAmount is zero', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.type(screen.getByLabelText('Title'), 'Vacation');
    // Set a future date so date validation passes
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await user.type(screen.getByLabelText('Target date'), futureDate);
    await user.click(screen.getByRole('button', { name: 'Save Goal' }));

    expect(await screen.findByTestId('goal-modal-error')).toHaveTextContent(/target amount must be greater than zero/i);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('shows a validation error when targetDate is missing', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();

    await user.type(screen.getByLabelText('Title'), 'Vacation');
    await user.type(screen.getByLabelText('Target amount'), '1000');
    await user.click(screen.getByRole('button', { name: 'Save Goal' }));

    expect(await screen.findByTestId('goal-modal-error')).toHaveTextContent(/target date is required/i);
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the form values when valid', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSubmit });

    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await user.type(screen.getByLabelText('Title'), 'Vacation');
    await user.type(screen.getByLabelText('Target amount'), '5000');
    await user.type(screen.getByLabelText('Currently saved'), '1000');
    await user.type(screen.getByLabelText('Target date'), futureDate);
    await user.click(screen.getByRole('button', { name: 'Save Goal' }));

    expect(onSubmit).toHaveBeenCalledWith({
      profileId: 'profile-1',
      title: 'Vacation',
      category: 'CUSTOM',
      targetAmount: 5000,
      currentAmount: 1000,
      targetDate: futureDate,
      expectedReturn: 0.07,
    });
  });

  it('calls onClose when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderModal();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onClose).toHaveBeenCalled();
  });

  describe('edit mode', () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const initial = {
      id: 'goal-1',
      profileId: 'profile-1',
      title: 'Existing Goal',
      category: 'CAR' as const,
      targetAmount: 50000,
      currentAmount: 5000,
      targetDate: `${futureDate}T00:00:00.000Z`,
      expectedReturn: 0.06,
      createdAt: '2026-05-07T00:00:00.000Z',
      updatedAt: '2026-05-07T00:00:00.000Z',
    };

    it('shows the edit heading and "Update goal" button in edit mode', () => {
      render(
        <CreateGoalModal
          open
          mode="edit"
          initial={initial}
          onClose={vi.fn()}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
        />,
      );
      expect(screen.getByRole('heading', { name: /edit financial goal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update goal/i })).toBeInTheDocument();
    });

    it('prefills form fields from `initial`', () => {
      render(
        <CreateGoalModal
          open
          mode="edit"
          initial={initial}
          onClose={vi.fn()}
          onSubmit={vi.fn().mockResolvedValue(undefined)}
        />,
      );
      expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Existing Goal');
      expect((screen.getByLabelText('Target amount') as HTMLInputElement).value).toBe('50000');
      expect((screen.getByLabelText('Currently saved') as HTMLInputElement).value).toBe('5000');
      expect((screen.getByLabelText('Target date') as HTMLInputElement).value).toBe(futureDate);
    });

    it('submits an UpdateGoalRequest payload (no profileId) on Save', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(
        <CreateGoalModal
          open
          mode="edit"
          initial={initial}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />,
      );

      // Tweak the title to confirm changes flow through.
      const titleInput = screen.getByLabelText('Title');
      await user.clear(titleInput);
      await user.type(titleInput, 'Renamed Goal');

      await user.click(screen.getByRole('button', { name: /update goal/i }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      const payload = onSubmit.mock.calls[0][0];
      expect(payload.title).toBe('Renamed Goal');
      expect(payload.targetAmount).toBe(50000);
      expect(payload.currentAmount).toBe(5000);
      expect(payload.category).toBe('CAR');
      expect(payload.targetDate).toBe(futureDate);
      expect(payload.expectedReturn).toBeCloseTo(0.06, 4);
      expect(payload).not.toHaveProperty('profileId');
    });
  });
});
