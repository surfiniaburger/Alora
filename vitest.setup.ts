import { vi } from 'vitest';
import '@testing-library/jest-dom';


// Mock the IntersectionObserver
class IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];

    constructor() { }

    observe() { }

    unobserve() { }

    disconnect() { }
}

(global as any).IntersectionObserver = IntersectionObserver;

// Mock navigator.mediaDevices.getUserMedia
if (navigator.mediaDevices === undefined) {
    (navigator as any).mediaDevices = {};
}
if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({
        getTracks: vi.fn().mockReturnValue([]),
    });
}

// Mock AudioContext
class AudioContext {
    // Mock properties and methods as needed
    destination = {};
    currentTime = 0;
    sampleRate = 44100;
    state = 'running';

    createGain() {
        return {
            gain: {
                value: 1,
                setValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
        };
    }

    createScriptProcessor() {
        return {
            connect: vi.fn(),
        };
    }

    createBufferSource() {
        return {
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            buffer: null,
        };
    }

    suspend() {
        this.state = 'suspended';
        return Promise.resolve();
    }

    resume() {
        this.state = 'running';
        return Promise.resolve();
    }

    close() {
        this.state = 'closed';
        return Promise.resolve();
    }

    get audioWorklet() {
        return {
            addModule: vi.fn().mockResolvedValue(undefined),
        };
    }
}

(global as any).AudioContext = AudioContext;
(global as any).webkitAudioContext = AudioContext;
(global as any).AudioWorkletNode = class {
    constructor() {}
};

// Mock the Geolocation API
const mockGeolocation = {
    getCurrentPosition: vi.fn().mockImplementation((success) =>
        Promise.resolve(
            success({
                coords: {
                    latitude: 34.1458, // Road Atlanta
                    longitude: -83.8177,
                    altitude: null,
                    accuracy: 1,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null,
                },
                timestamp: Date.now(),
            })
        )
    ),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
};

(global as any).navigator.geolocation = mockGeolocation;

// Mock Google Maps API
(global as any).google = {
  maps: {
    TravelMode: {
      DRIVING: 'DRIVING',
      WALKING: 'WALKING',
      BICYCLING: 'BICYCLING',
      TRANSIT: 'TRANSIT',
    },
    DirectionsService: class {
      route(request, callback) {
        const result = {
          routes: [
            {
              overview_path: [
                { lat: () => 34.1, lng: () => -83.8 },
                { lat: () => 34.2, lng: () => -83.9 },
              ],
              bounds: {
                getNorthEast: () => ({ lat: () => 34.2, lng: () => -83.8 }),
                getSouthWest: () => ({ lat: () => 34.1, lng: () => -83.9 }),
              },
            },
          ],
        };
        if (callback) {
          callback(result, 'OK');
        }
        return Promise.resolve(result);
      }
    },
    places: {
      Place: class {
        constructor(id) {}
        fetchFields(request) {
          return Promise.resolve({
            place: {
              location: { lat: () => 34.1458, lng: () => -83.8177 },
              displayName: 'Mock Station',
              rating: 4.5,
            },
          });
        }
      }
    },
    Geocoder: class {
      geocode(request, callback) {
        const result = {
          results: [
            {
              geometry: {
                location: { lat: () => 34.1458, lng: () => -83.8177 },
              },
              formatted_address: 'Mock Address, USA',
            },
          ],
        };
        if (callback) {
          callback(result, 'OK');
        }
        return Promise.resolve(result);
      }
    },
    LatLng: class {
        constructor(lat, lng) {}
        lat() { return 0; }
        lng() { return 0; }
    },
    LatLngBounds: class {
        constructor(sw, ne) {}
    },
    Size: class {},
    Point: class {},
    Map: class {
        setCenter() {}
        setZoom() {}
    },
    Marker: class {
        setMap() {}
    },
  },
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
