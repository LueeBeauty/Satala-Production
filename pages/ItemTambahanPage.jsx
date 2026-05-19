// Redirect to StokHPP with item-tambahan tab active
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ItemTambahanPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/stok-hpp', { replace: true });
  }, []);
  return null;
}