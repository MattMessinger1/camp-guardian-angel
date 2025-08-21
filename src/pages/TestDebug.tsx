export default function TestDebug() {
  
  return (
    <div style={{
      padding: '40px', 
      background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', 
      color: 'white',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{fontSize: '3rem', margin: '0 0 1rem 0', textAlign: 'center'}}>
        🎯 TEST DEBUG ROUTE WORKING!
      </h1>
      <p style={{fontSize: '1.2rem', textAlign: 'center', maxWidth: '600px', lineHeight: '1.6'}}>
        ✅ If you see this page, the routing fix worked successfully!
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.2)', 
        padding: '20px', 
        borderRadius: '10px', 
        marginTop: '2rem',
        textAlign: 'center'
      }}>
        <p style={{margin: '0', fontSize: '0.9rem'}}>
          Test route is working correctly!
        </p>
      </div>
    </div>
  );
}