export default function WorkingTest() {
  console.log('🔥 WorkingTest component loaded and rendering!');
  return (
    <div style={{ padding: '20px', background: 'blue', color: 'white' }}>
      <h1>WORKING TEST ROUTE - CACHE CLEARED!</h1>
      <p>This route definitely works</p>
      <p>Timestamp: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}