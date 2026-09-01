import { useEffect } from 'react';

/**
 * Hook para actualizar el título y la meta descripción por página de forma dinámica.
 */
export function useMetaTags(title, description) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | MyMedRecord`;
    }

    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }
  }, [title, description]);
}
