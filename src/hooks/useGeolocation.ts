import { useState, useEffect } from 'react';

interface Location {
  latitude: number;
  longitude: number;
  error?: string;
}

export const useGeolocation = () => {
  const [location, setLocation] = useState<Location>({
    latitude: 0,
    longitude: 0,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocalização não suportada pelo navegador');
      return;
    }

    // Configurações para obter localização com alta precisão
    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // Não usar cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Erro ao obter localização GPS:', error.message);
        setLocation({
          latitude: 0,
          longitude: 0,
          error: error.message,
        });
      },
      options
    );

    // Watch position para atualizações contínuas (opcional)
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Erro ao acompanhar localização GPS:', error.message);
      },
      options
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { location };
};

