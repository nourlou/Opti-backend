// utils/modelUtils.js
exports.getAbsoluteModelUrl = function(relativePath) {
  const baseUrl = 'http://localhost:3000';
  
  if (!relativePath) return '';
  if (relativePath.startsWith('http')) return relativePath;
  
  // Normaliser le chemin
  const normalizedPath = relativePath.startsWith('/') 
    ? relativePath 
    : `/${relativePath}`;
    
  return `${baseUrl}${normalizedPath}`;
};