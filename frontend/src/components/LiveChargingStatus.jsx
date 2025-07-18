import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

function LiveChargingStatus({ chargePointId, idTag }) {
  const [latest, setLatest] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(null);
  const [power, setPower] = useState(0);
  const [currentKWh, setCurrentKWh] = useState(0);
  const [currentAmp, setCurrentAmp] = useState(0);
  const [currentCost, setCurrentCost] = useState(0);
  const [cardBalance, setCardBalance] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (chargePointId) {
        axios
          .get(`/api/charge-points/${chargePointId}/current-transaction`)
          .then((res) => {
            const transaction = res.data;
            setLatest(transaction);
            setIsActive(transaction.active);
            setStartTime(transaction.start_time);

            if (transaction.active) {
              // 只有在交易進行中時才更新資料
              axios
                .get(`/api/charge-points/${chargePointId}/latest-power`)
                .then((res) => {
                  setPower(res.data.value || 0);
                })
                .catch(() => setPower(0));

              axios
                .get(`/api/charge-points/${chargePointId}/latest-current`)
                .then((res) => {
                  setCurrentAmp(res.data.value || 0);
                })
                .catch(() => setCurrentAmp(0));

              axios
                .get(`/api/charge-points/${chargePointId}/current-kwh`)
                .then((res) => {
                  setCurrentKWh(res.data.kwh || 0);
                })
                .catch(() => setCurrentKWh(0));

              axios
                .get(`/api/charge-points/${chargePointId}/current-cost`)
                .then((res) => {
                  setCurrentCost(res.data.cost || 0);
                })
                .catch(() => setCurrentCost(0));
            } else {
              // 停電或交易結束，數值歸零
              setPower(0);
              setCurrentAmp(0);
            }
          })
          .catch((err) => {
            console.error("Failed to fetch transaction:", err);
            setIsActive(false);
            setPower(0);
            setCurrentAmp(0);
            setCurrentKWh(0);
            setCurrentCost(0);
            setDuration(null);
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

      <p>即時功率：{power} kW</p>
      <p>即時電流：{currentAmp} A</p>
      <p>本次累積度數：{currentKWh.toFixed(2)} kWh</p>
      <p>即時金額：{currentCost.toFixed(2)} 元</p>
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
