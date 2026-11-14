import * as THREE from 'three';

// Original arcade portraits. Each path follows the 48-pixel grid, which
// keeps the silhouette legible even on the front of a distant packet.
type Print = 'wizard' | 'punk';
type PixelDrawing = (color: string, outline: string) => void;

function wizard(draw: PixelDrawing) {
  const ink = '#252441', robe = '#2857bc', blue = '#5188e5', gold = '#f5b544';
  // Staff, golden finial and a glint on the orb.
  draw(ink, 'M35 10h6v2h2v6h-2v2h-2v24h-4V20h-2v-2h-2v-5h2v-2h2z');
  draw('#99523c', 'M36 19h2v24h-2z');
  draw(gold, 'M35 12h5v2h2v3h-2v2h-5v-2h-2v-3h2z');
  draw('#fff4bd', 'M35 13h3v2h-3z');
  // Flared robe and belt, behind the beard.
  draw(ink, 'M15 25h8v1h4v3h3v2h4v-2h6v6h-2v2h-8v-1h-1v3h2v4h3v3H7v-4h2v-6h2v-7h4z');
  draw(robe, 'M15 28h9v2h3v3h7v2h-6v-1h-2v6h3v3h2v1H10v-2h2v-6h2z');
  draw(blue, 'M15 32h3v4h-2v5h-3v-4h2z');
  draw('#db9460', 'M34 31h4v3h-4z');
  draw(gold, 'M17 37h8v2h-8z');
  // The pale, tapering beard projects beyond the pointed nose.
  draw(ink, 'M13 19h12v2h3v3h3v4h-2v5h-2v3h-3v3h-3v2h-3v-3h-3v-4h-2v-6h-2v-6h2z');
  draw('#96a9ba', 'M14 23h12v3h3v2h-2v5h-3v3h-3v3h-2v-4h-3v-4h-2z');
  draw('#fff6dc', 'M15 24h8v2h4v2h-3v4h-2v3h-2v-3h-3v-4h-2z');
  draw('#e1a178', 'M15 20h10v2h2v2h3v2h-6v-2h-5v1h-4z');
  draw(ink, 'M22 21h2v2h-2z');
  // Crooked indigo hat with brass buckle, painted last to overlap the brow.
  draw(ink, 'M22 3h8v2h3v3h-5v2h-2v4h2v2h3v2h2v3H7v-3h2v-2h3v-5h3V8h3V5h4z');
  draw(robe, 'M22 5h7v1h2v1h-5v2h-2v5h1v2H14v-4h3V9h3V7h2z');
  draw(blue, 'M21 8h3v2h-2v2h-2v2h-3v-3h2v-1h2z');
  draw('#9f703d', 'M13 15h13v2H13z');
  draw(gold, 'M20 14h4v3h-4z');
  draw(blue, 'M10 18h20v1H10z');
}

function punk(draw: PixelDrawing) {
  const ink = '#182033', mint = '#80cdb2', shade = '#4a9d93', pink = '#ed508a';
  // Leather collar, shoulders and neck.
  draw(ink, 'M14 29h16v5h-2v2h6v2h4v3h3v5H6v-5h3v-3h5z');
  draw(shade, 'M17 30h10v5h-2v3h-3v2h-4v-3h-2z');
  draw('#405471', 'M10 40h4v-2h2v3h4v3H9v-2h1z M28 38h5v2h3v3h-9v-2h-2z');
  draw('#e9c078', 'M28 39h2v2h-2z M12 41h2v2h-2z');
  // Stepped profile with a pronounced brow and nose.
  draw(ink, 'M14 13h13v2h4v4h2v6h2v3h-3v5h-3v2h-9v-2h-5v-3h-3v-4h-2v-8h2v-3h2z');
  draw(mint, 'M15 16h12v2h3v7h2v2h-3v5h-9v-2h-4v-3h-3v-7h2z');
  draw(shade, 'M14 20h4v6h2v4h3v2h-3v-2h-4v-3h-3v-4h1z');
  draw('#c3e5c3', 'M27 25h2v2h-2z');
  draw(ink, 'M25 29h4v1h-4z');
  // Chunky black shades and two blue reflections.
  draw(ink, 'M12 20h19v1h2v3h-2v2h-4v-3h-3v3h-6v-2h-2v-2h-4z');
  draw('#70e9ee', 'M18 21h4v1h-4z M28 21h3v1h-3z');
  draw('#e6af45', 'M12 25h3v1h-2v2h2v-2h1v3h-4z');
  // Tall, asymmetric mohawk with a pale crest.
  draw(ink, 'M22 3h3v3h3V4h3v6h3v4h-3v3h-4v2h-8v2h-6v3h-3v-7h2v-4h3V9h3V6h4z');
  draw(pink, 'M23 6h1v2h5V7h1v4h2v2h-3v3h-4v1h-7v2h-4v2h-2v-4h2v-3h3v-4h3V8h3z');
  draw('#ffac9d', 'M23 8h2v2h-4v2h-3v2h-2v-4h4V9h3z');
  draw('#ad387a', 'M13 17h5v-2h7v-2h4v3h-4v1h-7v2h-5z');
}

export function inscriptionTexture(print: Print) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  const draw: PixelDrawing = (color, outline) => {
    ctx.fillStyle = color;
    ctx.fill(new Path2D(outline));
  };
  const isWizard = print === 'wizard';
  ctx.fillStyle = isWizard ? '#efcf88' : '#97c5db';
  ctx.fillRect(0, 0, 48, 48);
  ctx.fillStyle = isWizard ? '#dbb36c' : '#75a8c5';
  ctx.fillRect(0, 38, 48, 10);
  // Recessed register marks keep the plates distinct from HUD portraits.
  draw(isWizard ? '#fff0bc' : '#d4ebed', 'M2 2h5v1H3v4H2z M41 2h5v5h-1V3h-4z');
  if (isWizard) {
    draw('#fff0bc', 'M7 9h2v2h2v2H9v2H7v-2H5v-2h2z M40 23h2v2h2v2h-2v2h-2v-2h-2v-2h2z');
    wizard(draw);
  } else {
    punk(draw);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}
