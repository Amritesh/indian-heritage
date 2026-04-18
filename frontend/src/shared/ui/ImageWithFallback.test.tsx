import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ImageWithFallback } from '@/shared/ui/ImageWithFallback';

describe('ImageWithFallback', () => {
  it('shows the full image by default without cropping', () => {
    render(<ImageWithFallback src="https://example.com/image.jpg" alt="Artifact" />);

    expect(screen.getByRole('img', { name: 'Artifact' }).className).toContain('object-contain');
  });

  it('still allows explicit cover behavior when requested', () => {
    render(
      <ImageWithFallback
        src="https://example.com/image.jpg"
        alt="Hero"
        objectFit="cover"
      />,
    );

    expect(screen.getByRole('img', { name: 'Hero' }).className).toContain('object-cover');
  });
});
