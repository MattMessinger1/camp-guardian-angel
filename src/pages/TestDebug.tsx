// Simple test component to verify routing works
console.log("🔍 TestDebug component loaded");

export default function TestDebug() {
  console.log("🔍 TestDebug component rendered");
  alert("TestDebug component executed!");
  
  return (
    <div style={{padding: '20px', background: 'red', color: 'white'}}>
      <h1>TEST DEBUG COMPONENT</h1>
      <p>If you see this, routing to test components works!</p>
    </div>
  );
}