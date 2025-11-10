import React, { useEffect, useState } from "react";
import axios from "../axiosInstance";

export default function EditCardAccessModal({ idTag, onClose }) {
  const [cpList, setCpList] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    axios.get("/api/charge-points").then(r => setCpList(r.data));
    axios.get(`/api/cards/${idTag}/allowed-cps`).then(r => setSelected(r.data));
  }, [idTag]);

  const toggle = (cp) =>
    setSelected(selected.includes(cp)
      ? selected.filter(x => x !== cp)
      : [...selected, cp]);

  const save = () => {
    axios.put(`/api/cards/${idTag}/allowed-cps`, selected).then(onClose);
  };

  return (
    <div className="modal">
      <h3>允許充電樁 - {idTag}</h3>
      {cpList.map(cp => (
        <div key={cp.charge_point_id}>
          <label>
            <input
              type="checkbox"
              checked={selected.includes(cp.charge_point_id)}
              onChange={() => toggle(cp.charge_point_id)}
            />
            {cp.charge_point_id}
          </label>
        </div>
      ))}
      <button onClick={save}>儲存</button>
      <button onClick={onClose}>取消</button>
    </div>
  );
}
