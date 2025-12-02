/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { GroundingWidget } from '../../components/GroundingWidget';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

// Mock dependencies
vi.mock('@vis.gl/react-google-maps', () => ({
    useMapsLibrary: vi.fn(),
}));

describe('GroundingWidget', () => {
    let mockPlaceContextualElement: any;
    let mockPlaceContextualListConfigElement: any;
    let mockPlacesLibrary: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock Google Maps Places Library classes
        // We need to return real DOM elements because the component calls appendChild

        class MockPlaceContextualElement {
            constructor() {
                const element = document.createElement('div');
                // Add properties expected by the component
                Object.defineProperty(element, 'id', { value: '', writable: true });
                Object.defineProperty(element, 'contextToken', { value: '', writable: true });

                // We need to track the instance for assertions
                mockPlaceContextualElement = element;
                return element;
            }
        }

        class MockPlaceContextualListConfigElement {
            constructor() {
                const element = document.createElement('div');
                Object.defineProperty(element, 'mapHidden', { value: false, writable: true });

                mockPlaceContextualListConfigElement = element;
                return element;
            }
        }

        mockPlacesLibrary = {
            PlaceContextualElement: MockPlaceContextualElement,
            PlaceContextualListConfigElement: MockPlaceContextualListConfigElement,
        };

        (useMapsLibrary as any).mockReturnValue(mockPlacesLibrary);
    });

    it('renders container div', () => {
        const { container } = render(<GroundingWidget contextToken="test-token" />);
        expect(container.querySelector('.widget')).toBeInTheDocument();
    });

    it('initializes widget when library and token are available', () => {
        render(<GroundingWidget contextToken="test-token" />);

        // Check if the element was created and properties set
        // Since we return a real DOM element, we can check its properties
        expect(mockPlaceContextualElement).toBeDefined();
        expect(mockPlaceContextualElement.contextToken).toBe('test-token');
        expect(mockPlaceContextualElement.id).toBe('widget');
    });

    it('does not initialize if library is missing', () => {
        // Reset mock to null to verify it wasn't created
        mockPlaceContextualElement = null;
        (useMapsLibrary as any).mockReturnValue(null);
        render(<GroundingWidget contextToken="test-token" />);

        expect(mockPlaceContextualElement).toBeNull();
    });

    it('does not initialize if token is missing', () => {
        mockPlaceContextualElement = null;
        render(<GroundingWidget contextToken="" />);

        expect(mockPlaceContextualElement).toBeNull();
    });

    it('configures map visibility correctly (default)', () => {
        render(<GroundingWidget contextToken="test-token" />);

        expect(mockPlaceContextualListConfigElement).toBeDefined();
        expect(mockPlaceContextualListConfigElement.mapHidden).toBe(false);
        // Verify appending happened by checking if list config is a child of the element
        expect(mockPlaceContextualElement.contains(mockPlaceContextualListConfigElement)).toBe(true);
    });

    it('configures map visibility correctly (hidden)', () => {
        render(<GroundingWidget contextToken="test-token" mapHidden={true} />);

        expect(mockPlaceContextualListConfigElement.mapHidden).toBe(true);
    });

    it('cleans up on unmount', () => {
        const { unmount, container } = render(<GroundingWidget contextToken="test-token" />);

        // Verify content was added
        const widgetDiv = container.querySelector('.widget');
        // In JSDOM, we can't easily check if the custom element was appended since it's a mock object,
        // but we can verify the cleanup logic clears innerHTML

        unmount();

        expect(widgetDiv).toBeEmptyDOMElement();
    });
});
