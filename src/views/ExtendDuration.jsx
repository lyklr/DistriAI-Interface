import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";
// import { getDetailByUuid } from "../services/order";
import SolanaAction from "../components/SolanaAction";
import webconfig from "../webconfig";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useSnackbar } from "notistack";
import { CircularProgress } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import DurationProgress from "../components/DurationProgress";
import DurationToggle from "../components/DurationToggle";
import * as anchor from "@project-serum/anchor";
import Countdown from "../components/Countdown";
import { getOrderDetail } from "../services/order";

function ExtendDuration({ className }) {
  const { id } = useParams();
  document.title = "Edit model";
  const navigate = useNavigate();
  const childRef = useRef();
  const wallet = useAnchorWallet();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [extending, setExtending] = useState(false);
  const [duration, setDuration] = useState(1);
  const [amount, setAmount] = useState(0);
  const [balance, setBalance] = useState(0);
  const [deviceDetail, setDeviceDetail] = useState({});
  const [orderDetail, setOrderDetail] = useState({});

  const getTokenBalance = async (mint, address) => {
    let res = await childRef.current.getTokenAccountBalance(mint, address);
    setBalance(res / LAMPORTS_PER_SOL);
    return res;
  };
  const onSubmit = async () => {
    setExtending(true);
    const [machinePublicKey] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("machine"),
        new PublicKey(deviceDetail.Provider).toBytes(),
        anchor.utils.bytes.hex.decode(deviceDetail.UUID),
      ],
      webconfig.PROGRAM
    );
    let res = await childRef.current.renewOrder(machinePublicKey, id, duration);
    setTimeout(() => {
      if (res?.msg === "ok") {
        enqueueSnackbar(`Order extended ${duration} h.`, {
          variant: "success",
        });
        navigate("/order");
      } else {
        enqueueSnackbar(res.msg, { variant: "error" });
      }
      setExtending(false);
    }, 300);
  };
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const res = await getOrderDetail(id);
      setOrderDetail(res);
      if (res.Metadata?.MachineInfo) {
        setDeviceDetail(res.Detail.Metadata.MachineInfo);
      }
      await getTokenBalance(webconfig.MINT_PROGRAM, wallet.publicKey);
      setLoading(false);
    };
    if (wallet?.publicKey) {
      init();
    }
    // eslint-disable-next-line
  }, [wallet, id]);
  useEffect(() => {
    setAmount(duration * deviceDetail.Price || 0);
  }, [duration, deviceDetail]);
  return (
    <div className={className}>
      <SolanaAction ref={childRef}></SolanaAction>
      <div className="con">
        <h1 className="title">Extend Duration</h1>
        {loading ? (
          <CircularProgress />
        ) : (
          <div className="myform">
            <div className="info-box">
              <div className="info-box-title">Configuration</div>
              <div className="info-box-body">
                <div className="line">
                  <div className="f">
                    <span style={{ fontSize: 18, fontWeight: "bold" }}>
                      {deviceDetail.GPU}
                    </span>
                    <span>{deviceDetail.Tflops || "--"} TFLOPS</span>
                  </div>
                </div>
                <div
                  className="line"
                  style={{ justifyContent: "space-between" }}>
                  <div style={{ width: "30%" }}>
                    <span>RAM</span>
                    <span>{deviceDetail.RAM}</span>
                  </div>
                  <div style={{ width: "30%" }}>
                    <span>Avail Disk Storage</span>
                    <span>{deviceDetail.AvailDiskStorage} GB</span>
                  </div>
                  <div style={{ width: "30%" }}>
                    <span>CPU</span>
                    <span>{deviceDetail.CPU}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="info-box">
              <div className="info-box-title">Order Info</div>
              <div className="info-box-body">
                <div className="time">
                  <div>
                    <label>Start Time</label>
                    <span>
                      {new Date(orderDetail.StartTime).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <label>Remaining Time</label>
                    <span>
                      <Countdown
                        deadlineTime={new Date(orderDetail.EndTime).getTime()}
                      />
                    </span>
                  </div>
                </div>
                {orderDetail.StatusName !== "Failed" && (
                  <DurationProgress
                    startTime={orderDetail.StartTime}
                    duration={orderDetail.Duration}
                  />
                )}
                <DurationToggle
                  duration={duration}
                  setDuration={setDuration}
                  max={deviceDetail.MaxDuration - orderDetail.Duration}
                  title="Extend Duration"
                />
                <div
                  style={{ margin: "16px 0", color: "#aaa", display: "flex" }}>
                  <label style={{ width: "120px", display: "block" }}>
                    Max Duration
                  </label>
                  <span>{deviceDetail.MaxDuration}h</span>
                </div>
                <div
                  style={{ margin: "16px 0", color: "#aaa", display: "flex" }}>
                  <label style={{ width: "120px", display: "block" }}>
                    Price(h)
                  </label>
                  <span>{orderDetail.Price} DIST</span>
                </div>
              </div>
            </div>
            <div className="right-txt">Balance: {balance} DIST</div>
            <div className="color-box">
              <div className="row-txt">Total</div>
              <div className="drow">
                <span className="num">{amount}</span>
                <label>DIST</label>
              </div>
            </div>
            <div className="form-row btn-row">
              <LoadingButton
                loading={extending}
                style={{ width: 154 }}
                className="cbtn"
                onClick={onSubmit}>
                {extending ? "" : "Confirm"}
              </LoadingButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default styled(ExtendDuration)`
  width: 100%;
  .con {
    width: 1160px;
    padding: 0 20px;
    margin: 10px auto;
    display: block;
    overflow: hidden;
    .title {
      font-weight: 700;
      font-style: normal;
      font-size: 28px;
      color: #ffffff;
      margin-top: 25px;
      line-height: 70px;
    }
    .info-box {
      display: block;
      .info-box-title {
        font-weight: bold;
        font-size: 16px;
        color: #ffffff;
        border-bottom: 1px solid #797979;
        line-height: 48px;
      }
      .info-box-body {
        padding: 5px 0;
        display: block;
        .line {
          padding: 10px 0;
          display: flex;
          flex-direction: row;
          .f {
            width: 100%;
          }
          span {
            line-height: 24px;
            display: block;
            clear: both;
            font-size: 14px;
          }
          .l {
            width: 50%;
          }
          .r {
            width: 50%;
          }
        }
      }
    }
    .b-box {
      display: block;
      padding: 30px;
      border: 1px solid rgba(121, 121, 121, 1);
      border-radius: 5px;
      margin: 20px 0;
      .row {
        display: block;
        line-height: 30px;
        font-size: 14px;
        text-align: center;
        b {
          font-size: 24px;
        }
      }
    }
    .right-txt {
      display: block;
      overflow: hidden;
      text-align: right;
      line-height: 30px;
      font-size: 14px;
      color: #e0c4bd;
    }
    .color-box {
      border-radius: 5px;
      background-color: #151515;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      padding: 19px 10px;
      .row-txt {
        font-size: 16px;
        font-weight: bold;
        line-height: 51px;
      }
      .drow {
        display: flex;
        flex-direction: column;
        span {
          width: 100%;
          font-size: 28px;
          font-weight: bold;
          text-align: right;
        }
        label {
          width: 100%;
          font-size: 13px;
          text-align: right;
        }
      }
    }
    .btn-row {
      display: block;
      margin: 30px 0;
    }
  }
  .time {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    span {
      font-weight: bolder;
      padding: 0 8px;
    }
  }
`;
