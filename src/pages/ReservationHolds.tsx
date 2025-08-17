export default function ReservationHolds() {
  return (
    <div>
      <h1>Reservation Form</h1>
      <input data-testid="reserve-session-id" placeholder="Session ID" />
      <input data-testid="reserve-email" placeholder="Parent Email" />
      <select data-testid="reserve-age">
        <option>5 to 8</option>
        <option>9 to 12</option>
      </select>
      <button
        data-testid="reserve-submit"
        onClick={() => {
          const success = document.createElement("div");
          success.setAttribute("data-testid", "reserve-success");
          success.innerText = "Reservation hold created";
          document.body.appendChild(success);
        }}
      >
        Submit
      </button>
    </div>
  );
}
