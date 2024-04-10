import moment from "moment";
import { getTimeDiff } from "time-difference-js";
import { utils } from "@project-serum/anchor";
import { formatBalance, getProvider } from "../utils";
import axios from "../utils/axios";

const baseUrl = "/order";

export async function getOrderList(pageIndex, pageSize, filter, publicKey) {
  const apiUrl = baseUrl + "/mine";
  const body = {
    Page: pageIndex,
    PageSize: pageSize,
  };
  const headers = {
    Account: publicKey,
  };
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== "all") {
        body[key] = value;
      }
    });
  }
  try {
    const res = await axios.post(apiUrl, body, {
      headers,
    });
    for (let order of res.List) {
      order = formatOrder(order);
    }
    return res;
  } catch (error) {
    throw error;
  }
}

export async function getTotalEarnings(total, publicKey) {
  const apiUrl = baseUrl + "/mine";
  const body = {
    Page: 1,
    PageSize: total,
  };
  const headers = {
    Account: publicKey,
  };
  try {
    const res = await axios.post(apiUrl, body, {
      headers,
    });
    let pending = 0;
    let received = 0;
    res.List.forEach((currentValue) => {
      if (currentValue.Status === 0 || currentValue.Status === 1) {
        pending += currentValue.Total;
      } else if (currentValue.Status === 2) {
        received += currentValue.Total;
      }
    });
    return { pending, received };
  } catch (error) {
    throw error;
  }
}

export async function getOrderDetail(Id) {
  const apiUrl = baseUrl + `/${Id}`;
  try {
    const res = await axios.get(apiUrl);
    return formatOrder(res);
  } catch (error) {
    throw error;
  }
}

export const filterData = {
  Status: [
    { label: "All Status", value: "all" },
    { label: "Preparing", value: "0" },
    { label: "Available", value: "1" },
    { label: "Completed", value: "2" },
    { label: "Failed", value: "3" },
    { label: "Refunded", value: "4" },
  ],
};

// Format Order Info
function formatOrder(item) {
  if (item.Metadata) {
    item.Metadata = JSON.parse(item.Metadata);
  }
  item.Price = formatBalance(item.Price);
  item.Total = formatBalance(item.Total);
  let endTime = moment(item.StartTime).add(item.Duration, "hours").toDate();
  const statusName = [
    "Preparing",
    "Available",
    "Completed",
    "Failed",
    "Refunded",
  ];
  item.StatusName = statusName[item.Status];
  if (item.StatusName === "Available") {
    if (new Date() < endTime) {
      const result = getTimeDiff(new Date(), endTime);
      item.RemainingTime = result.value + " " + result.suffix;
      item.RemainingDuration = result.suffix.includes("hour")
        ? result.value
        : 1;
    }
  } else if (item.StatusName === "Failed") {
    item.Duration = 0;
  }
  item.EndTime = endTime.toISOString();
  if (item.RefundTime && new Date(item.RefundTime).getTime() !== 0) {
    item.RefundDuration =
      item.Duration -
      Math.ceil(
        (new Date(item.RefundTime) - new Date(item.OrderTime)) / 3600000
      );
  }
  return item;
}

export const signToken = async (ip, port, publicKey, deploy) => {
  const provider = getProvider();
  const msg = (deploy ? "deploy" : "workspace") + "/token/" + publicKey;
  const encodeMsg = new TextEncoder().encode(msg);
  try {
    const sign = await provider.signMessage(encodeMsg, "utf8");
    const signature = utils.bytes.bs58.encode(sign.signature);
    return `http://${ip}:${port}/distri/workspace/debugToken/${signature}`;
  } catch (error) {
    throw error;
  }
};
