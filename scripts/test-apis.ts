async function testAPIs() {
  const apis = [
    { name: 'Mundos', url: '/api/worlds' },
    { name: 'Pueblos', url: '/api/pueblos' },
    { name: 'Edificios', url: '/api/edificios' },
    { name: 'NPCs', url: '/api/npcs' },
  ];

  console.log('🧪 Probando APIs...\n');

  for (const api of apis) {
    try {
      const response = await fetch(`http://localhost:3000${api.url}`);
      const result = await response.json();

      if (result.success && result.data) {
        console.log(`✅ ${api.name}: ${result.data.length} registros`);
      } else {
        console.log(`❌ ${api.name}: Error en la respuesta`);
      }
    } catch (error) {
      console.log(`❌ ${api.name}: ${error}`);
    }
  }
}

testAPIs();
