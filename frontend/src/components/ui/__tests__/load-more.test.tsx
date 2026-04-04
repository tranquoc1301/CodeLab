import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadMoreControl } from '@/components/ui/load-more';

describe('LoadMoreControl', () => {
  const defaultProps = {
    hasNext: true,
    isLoadingMore: false,
    error: null,
    onLoadMore: vi.fn(),
    onRetry: vi.fn(),
    loadedCount: 20,
    totalCount: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Load More button when hasNext is true', () => {
    render(<LoadMoreControl {...defaultProps} />);
    const button = screen.getByRole('button', { name: /load more problems/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onLoadMore when button is clicked', () => {
    render(<LoadMoreControl {...defaultProps} />);
    const button = screen.getByRole('button', { name: /load more problems/i });
    fireEvent.click(button);
    expect(defaultProps.onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when isLoadingMore is true', () => {
    render(<LoadMoreControl {...defaultProps} isLoadingMore />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /load more problems/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('disables button when isLoadingMore is true', () => {
    render(<LoadMoreControl {...defaultProps} isLoadingMore />);
    const button = screen.getByRole('button', { name: /load more problems/i });
    expect(button).toBeDisabled();
  });

  it('shows error state with retry button', () => {
    render(<LoadMoreControl {...defaultProps} error={new Error('Network error')} />);
    expect(screen.getByText(/failed to load more problems/i)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    render(<LoadMoreControl {...defaultProps} error={new Error('Network error')} />);
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows completion message when hasNext is false and items loaded', () => {
    render(<LoadMoreControl {...defaultProps} hasNext={false} />);
    expect(screen.getByText(/20 of 100 problems loaded/i)).toBeInTheDocument();
  });

  it('renders nothing when hasNext is false and no items loaded', () => {
    const { container } = render(
      <LoadMoreControl {...defaultProps} hasNext={false} loadedCount={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('debounces rapid clicks', async () => {
    vi.useFakeTimers();
    render(<LoadMoreControl {...defaultProps} />);
    const button = screen.getByRole('button', { name: /load more problems/i });
    
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    expect(defaultProps.onLoadMore).toHaveBeenCalledTimes(1);
    
    vi.advanceTimersByTime(500);
    fireEvent.click(button);
    expect(defaultProps.onLoadMore).toHaveBeenCalledTimes(2);
    
    vi.useRealTimers();
  });

  it('has proper ARIA attributes', () => {
    render(<LoadMoreControl {...defaultProps} />);
    const button = screen.getByRole('button', { name: /load more problems/i });
    expect(button).toHaveAttribute('aria-label', 'Load more problems');
    expect(button).toHaveAttribute('aria-busy', 'false');
  });

  it('shows loaded count when totalCount is available', () => {
    render(<LoadMoreControl {...defaultProps} />);
    expect(screen.getByText(/20 of 100 problems/i)).toBeInTheDocument();
  });

  it('hides count when totalCount is null', () => {
    render(<LoadMoreControl {...defaultProps} totalCount={null} />);
    expect(screen.queryByText(/problems/i)).not.toBeInTheDocument();
  });
});
