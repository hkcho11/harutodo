declare namespace kakao.maps {
  function load(callback: () => void): void;

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class Map {
    constructor(
      container: HTMLElement,
      options: { center: LatLng; level: number }
    );
    setCenter(latLng: LatLng): void;
    relayout(): void;
  }

  class Marker {
    constructor(options: { position: LatLng; map?: Map });
    setMap(map: Map | null): void;
  }
}

interface Window {
  kakao: typeof kakao;
}
