import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollViewportToTop } from '@/lib/scroll';

export default function RouteScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    scrollViewportToTop();
  }, [location.pathname, location.search]);

  return null;
}
