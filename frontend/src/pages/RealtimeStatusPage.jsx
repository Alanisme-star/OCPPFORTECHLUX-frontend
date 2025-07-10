import React, { useState, useEffect } from "react";
import axios from "../axiosInstance";
import LiveChargingStatus from "../components/LiveChargingStatus"; // 若放在 components 改路徑

function RealtimeStatusPage() {
  const [chargePoints, setChargePoints] = useState([]);
  const [idTags, setIdTags] = useState([]);
  const [chargePointId, setChargePointId] = useState("");
  const [idTag, setIdTag] = useState("");

  useEffect(() => {
    axios.get("/api/charge-points").then(res => setChargePoints(res.data));
    axios.get("/api/id_tags").then(res => setIdTags(res.data));
  }, []);

  return (
    <div className="p-8">
      <div className="flex gap-4 mb-4">
        <select
          className="p-2 rounded bg-white text-black"
          value={chargePointId}
          onChange={e => setChargePointId(e.target.value)}
        >
          <option value="">選擇充電樁</option>
          {chargePoints.map(cp => (
            <option key={cp.chargePointId} value={cp.chargePointId}>
              {cp.chargePointId} {cp.name ? `(${cp.name})` : ""}
            </option>
          ))}
        </select>
        <select
          className="p-2 rounded bg-white text-black"
          value={idTag}
          onChange={e => setIdTag(e.target.value)}
        >
          <option value="">選擇用戶卡片</option>
          {idTags.map(card => (
            <option key={card.idTag} value={card.idTag}>
              {card.idTag}
            </option>
          ))}
        </select>
      </div>
      <LiveChargingStatus chargePointId={chargePointId} idTag={idTag} />
    </div>
  );
}

export default RealtimeStatusPage;
