import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function LiveChargingStatus({ chargePointId, idTag }) {
  const [latest, setLatest] = useState(null);

  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);



  useEffect(() => {
    if (!chargePointId || !idTag) return;
    const fetchStatus = () => {
      axios.get(`/api/charge-points/${chargePointId}/latest-meter`)
        .then((res) => setLatest(res.data))
        .catch(() => setLatest(null));

      axios.get(`/api/charge-points/${chargePointId}/current-transaction`)
        .then((res) => {
          if (typeof res.data.kwh === "number") {

          } else {

          }
          setIsActive(res.data.active);
          setStartTime(res.data.start_time);
        })
        .catch(() => {

          setIsActive(false);
          setStartTime(null);
        });
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [chargePointId, idTag]);

  if (!chargePointId || !idTag) {
    return <div className="text-gray-500">請先選擇充電樁和用戶卡片</div>;
  }

  
  return (
    <div className="bg-white text-black p-4 rounded-xl shadow-lg w-full max-w-xl">
      <h2 className="text-lg font-bold mb-2">🔌 即時充電狀態</h2>
      <div className="space-y-2">


        <p><strong>充電樁 ID：</strong>{chargePointId}</p>
        <p><strong>用戶 ID：</strong>{idTag}</p>
        </div>
    </div>
  );
}

export default LiveChargingStatus;
