import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function LiveChargingStatus({ chargePointId, idTag }) {
  const [latest, setLatest] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(null);
  const [power, setPower] = useState(null);
  const [currentKWh, setCurrentKWh] = useState(null);
  const [currentAmp, setCurrentAmp] = useState(null);
  const [currentCost, setCurrentCost] = useState(null);
  const [cardBalance, setCardBalance] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (chargePointId) {
        // 取得交易狀態
        axios
          .get(`/api/charge-points/${chargePointId}/current-transaction`)
          .then((res) => {
            setLatest(res.data);
            setIsActive(res.data.active);
            setStartTime(res.data.start_time);

            if (!res.data.active) {
              setPower(0);
              setCurrentAmp(0);
              setCurrentKWh(0);
              setCurrentCost(0);
              setDuration(null);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch transaction:", err);
          });

        // 取得其他資料（如果仍在進行中）
        axios
          .get(`/api/charge-points/${chargePointId}/latest-power`)
          .then((res) => {
            setPower(res.data.value);
          })
          .catch(() => {
            setPower(null);
          });

        axios
          .get(`/api/charge-points/${chargePointId}/latest-current`)
          .then((res) => {
            setCurrentAmp(res.data.value);
          })
          .catch(() => {
            setCurrentAmp(null);
          });

        axios
          .get(`/api/charge-points/${chargePointId}/current-kwh`)
          .then((res) => {
            setCurrentKWh(res.data.kwh);
          })
          .catch(() => {
            setCurrentKWh(null);
          });

        axios
          .get(`/api/charge-points/${chargePointId}/current-cost`)
          .then((res) => {
            setCurrentCost(res.data.cost);
          })
          .catch(() => {
            setCurrentCost(null);
          });
      }

      if (idTag) {
        axios
          .get(`/api/cards/${idTag}/balance`)
          .then((res) => {
            setCardBalance(res.data.balance);
          })
          .catch(() => {
            setCardBalance(null);
          });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [chargePointId, idTag]);

  // 充電時間計算
  useEffect(() => {
    let timer;
    if (isActive && startTime) {
      timer = setInterval(() => {
        const start = new Date(startTime);
        const now = new Date();
        const seconds = Math.floor((now - start) / 1000);
        setDuration(seconds);
      }, 1000);
    } else {
      setDuration(null);
    }

    return () => clearInterval(timer);
  }, [isActive, startTime]);

  return (
    <div>
      <h2>⚡ 即時充電狀態</h2>
      <p>充電樁 ID：{chargePointId}</p>
      <p>用戶 ID：{idTag}</p>

      <p>即時功率：{power !== null ? `${power} kW` : "尚無功率資料"}</p>
      <p>即時電流：{currentAmp !== null ? `${currentAmp} A` : "尚無電流資料"}</p>
      <p>本次累積度數：{currentKWh !== null ? `${currentKWh.toFixed(2)} kWh` : "尚無累積資料"}</p>
      <p>即時金額：{currentCost !== null ? `${currentCost.toFixed(2)} 元` : "尚無金額資料"}</p>
      <p>
        本次充電時間：
        {duration !== null
          ? `${Math.floor(duration / 60)} 分 ${duration % 60} 秒`
          : "尚無充電時間資料"}
      </p>
      <p>
        卡片餘額：
        {cardBalance !== null && currentCost !== null
          ? `${(cardBalance - currentCost).toFixed(2)} 元`
          : "尚無卡片餘額資料"}
      </p>
    </div>
  );
}

export default LiveChargingStatus;
