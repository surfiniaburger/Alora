/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Map3DCameraProps } from '@/components/map-3d';
import { lookAtWithPadding } from './look-at';
import { MapMarker } from './state';

type MapControllerDependencies = {
  map: google.maps.maps3d.Map3DElement;
  maps3dLib: google.maps.Maps3DLibrary;
  elevationLib: google.maps.ElevationLibrary;
};

/**
 * A controller class to centralize all interactions with the Google Maps 3D element.
 */
export class MapController {
  private map: google.maps.maps3d.Map3DElement;
  private maps3dLib: google.maps.Maps3DLibrary;
  private elevationLib: google.maps.ElevationLibrary;

  // Race Layer Elements
  private trackPolyline: google.maps.maps3d.Polyline3DElement | null = null;
  private carMarker: google.maps.maps3d.Marker3DInteractiveElement | null = null;
  private ghostMarker: google.maps.maps3d.Marker3DInteractiveElement | null = null;
  
  // Tool/Search Markers
  private toolMarkers: google.maps.maps3d.Marker3DInteractiveElement[] = [];

  constructor(deps: MapControllerDependencies) {
    this.map = deps.map;
    this.maps3dLib = deps.maps3dLib;
    this.elevationLib = deps.elevationLib;
  }

  /**
   * Clears "Tool" markers (search results), but preserves the Race Layer (track/cars).
   */
  clearMap() {
    // Remove only tool markers
    this.toolMarkers.forEach(marker => marker.remove());
    this.toolMarkers = [];
  }

  /**
   * Adds a list of markers to the map (from Tools).
   * @param markers - An array of marker data to be rendered.
   */
  addMarkers(markers: MapMarker[]) {
    for (const markerData of markers) {
      const marker = new this.maps3dLib.Marker3DInteractiveElement({
        position: markerData.position,
        altitudeMode: 'RELATIVE_TO_MESH',
        label: markerData.showLabel ? markerData.label : null,
        title: markerData.label,
        drawsWhenOccluded: true,
      });
      this.map.appendChild(marker);
      this.toolMarkers.push(marker);
    }
  }

  /**
   * Draws the race track on the map.
   */
  drawTrack(path: google.maps.LatLngAltitudeLiteral[]) {
    if (this.trackPolyline) {
      this.trackPolyline.coordinates = path;
      return;
    }
    
    this.trackPolyline = new this.maps3dLib.Polyline3DElement({
      coordinates: path,
      strokeColor: 'rgba(235, 10, 30, 0.8)', // GR Red with opacity
      strokeWidth: 4,
      altitudeMode: 'RELATIVE_TO_MESH'
    });
    this.map.appendChild(this.trackPolyline);
  }

  /**
   * Updates the position of the race cars.
   */
  updateRaceCars(
    carPos?: google.maps.LatLngAltitudeLiteral, 
    ghostPos?: google.maps.LatLngAltitudeLiteral,
    carHeading?: number,
    ghostHeading?: number
  ) {
    const currentCameraHeading = this.map.heading || 0;

    // Update Main Car
    if (carPos) {
      const rotation = (carHeading ?? 0) - currentCameraHeading;
      // Must use <template> for custom marker content. 
      // The content MUST be an SVG or IMG element directly.
      // Removing wrapper div and applying styles to svg.
      // We use .trim() to ensure no whitespace text nodes are created, which causes errors.
      const svgContent = `
          <svg width="50" height="50" viewBox="0 0 24 24" style="transform: rotate(${rotation}deg); transform-origin: center; overflow: visible; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">
             <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="white" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
          </svg>
      `.trim();

      if (!this.carMarker) {
        this.carMarker = new this.maps3dLib.Marker3DInteractiveElement({
          position: carPos,
          altitudeMode: 'RELATIVE_TO_MESH',
          label: 'GR SUPRA',
          drawsWhenOccluded: true,
        });
        
        const template = document.createElement('template');
        template.innerHTML = svgContent;
        this.carMarker.append(template);
        this.map.appendChild(this.carMarker);
      } else {
        this.carMarker.position = carPos;
        // Replace template to update rotation
        const oldTemplate = this.carMarker.querySelector('template');
        if (oldTemplate) {
          this.carMarker.removeChild(oldTemplate);
        }
        const newTemplate = document.createElement('template');
        newTemplate.innerHTML = svgContent;
        this.carMarker.append(newTemplate);
      }
    }

    // Update Ghost Car
    if (ghostPos) {
      const rotation = (ghostHeading ?? 0) - currentCameraHeading;
      const svgContent = `
          <svg width="50" height="50" viewBox="0 0 24 24" style="transform: rotate(${rotation}deg); transform-origin: center; overflow: visible;">
             <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="rgba(235, 10, 30, 0.2)" stroke="#eb0a1e" stroke-width="2"/>
          </svg>
      `.trim();

      if (!this.ghostMarker) {
        this.ghostMarker = new this.maps3dLib.Marker3DInteractiveElement({
          position: ghostPos,
          altitudeMode: 'RELATIVE_TO_MESH',
          label: 'RIVAL',
          drawsWhenOccluded: true,
        });
        
        const template = document.createElement('template');
        template.innerHTML = svgContent;
        this.ghostMarker.append(template);
        this.map.appendChild(this.ghostMarker);
      } else {
        this.ghostMarker.position = ghostPos;
        // Replace template to update rotation
        const oldTemplate = this.ghostMarker.querySelector('template');
        if (oldTemplate) {
          this.ghostMarker.removeChild(oldTemplate);
        }
        const newTemplate = document.createElement('template');
        newTemplate.innerHTML = svgContent;
        this.ghostMarker.append(newTemplate);
      }
    }
  }

  /**
   * Animate the camera to a specific set of camera properties.
   * @param cameraProps - The target camera position, range, tilt, etc.
   */
  flyTo(cameraProps: Map3DCameraProps) {
    this.map.flyCameraTo({
      durationMillis: 5000,
      endCamera: {
        center: {
          lat: cameraProps.center.lat,
          lng: cameraProps.center.lng,
          altitude: cameraProps.center.altitude,
        },
        range: cameraProps.range,
        heading: cameraProps.heading,
        tilt: cameraProps.tilt,
        roll: cameraProps.roll,
      },
    });
  }

  /**
   * Calculates the optimal camera view to frame a set of entities and animates to it.
   * @param entities - An array of entities to frame (must have a `position` property).
   * @param padding - The padding to apply around the entities.
   */
  async frameEntities(
    entities: { position: { lat: number; lng: number } }[],
    padding: [number, number, number, number],
  ) {
    if (entities.length === 0) return;

    const elevator = new this.elevationLib.ElevationService();
    const cameraProps = await lookAtWithPadding(
      entities.map(e => e.position),
      elevator,
      0, // heading
      padding,
    );

    this.flyTo({
      center: {
        lat: cameraProps.lat,
        lng: cameraProps.lng,
        altitude: cameraProps.altitude,
      },
      range: cameraProps.range + 1000, // Add a bit of extra range
      heading: cameraProps.heading,
      tilt: cameraProps.tilt,
      roll: 0,
    });
  }
}
