import { Capacitor } from '@capacitor/core';
import { EVChargingStation } from '@/lib/ev-mode-state';

/**
 * Handles navigation to a selected EV charging station.
 * Opens Google Maps (native or web) and sends an AI announcement.
 */
export function navigateToStation(
    station: EVChargingStation,
    client?: any,
    connected?: boolean
) {
    if (!station) return;

    console.log(`[Navigation] Navigating to: ${station.name}`);

    const { lat, lng } = station.position;

    if (Capacitor.isNativePlatform()) {
        // Native platform: Use Google Maps app via deep link
        const navigationUrl = `google.navigation:q=${lat},${lng}&mode=d`;
        window.open(navigationUrl, '_system');
    } else {
        // Web platform: Use Google Maps web URL
        const webNavigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        window.open(webNavigationUrl, '_blank');
    }

    // Send AI announcement if client is available
    if (client && connected) {
        const aiMessage = `SYSTEM ALERT: User has started navigation to ${station.name}. End conversation to allow for driving focus, or offer to play music.`;
        client.send([{ text: aiMessage }]);
        console.log(`[Navigation] AI announcement sent: ${aiMessage}`);
    }
}
