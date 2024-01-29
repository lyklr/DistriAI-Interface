import styled from "styled-components";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import copy from "copy-to-clipboard";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { formatAddress } from "../utils";
import { useSnackbar } from "notistack";
import { CircularProgress, Button, Modal, Box } from "@mui/material";

function Header({ className, list, loading }) {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(loading);
  const [decrypted, setDecrypted] = useState(false);
  const wallet = useAnchorWallet();
  let addr = wallet?.publicKey.toString();
  useEffect(() => {
    for (let item of list) {
      item.Loading = false;
    }
  }, [list]);
  let columns = [
    {
      title: "Time",
      width: "10%",
      key: "BuyTime",
      render: (text, record, index) => {
        return (
          <div className="time">
            <div className="y">
              {moment(record.OrderTime).format("YYYY.MM.DD")}
            </div>
            <div className="h">
              {moment(record.OrderTime).format("HH:mm:ss")}
            </div>
          </div>
        );
      },
    },
    {
      title: "Task Name",
      width: "14%",
      key: "TaskName",
      render: (text, record, index) => {
        return record.Metadata?.formData?.taskName || "--";
      },
    },
    {
      title: "Price (h)",
      width: "10%",
      key: "Price",
      render: (text, record, index) => {
        return (
          <div className="price">
            <span
              style={{
                margin: 0,
                borderRadius: "100%",
                backgroundColor: "white",
                backgroundImage: "url('/img/token.png')",
                backgroundSize: "70%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                width: "24px",
                height: "24px",
              }}
            />
            <span>{record.Price}</span>
          </div>
        );
      },
    },
    {
      title: "Remaining Time",
      width: "10%",
      key: "RemainingTime",
      render: (text, record, index) => {
        return <div>{record.RemainingTime}</div>;
      },
    },
    {
      title: "Total",
      width: "10%",
      key: "Total",
      render: (text, record, index) => {
        return (
          <div className="total">
            <label>{text}</label>
            <span>
              {record.Seller === formatAddress(addr) ? "sell" : "buy"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Status",
      width: "10%",
      key: "StatusName",
      render: (text, record, index) => {
        return <div className={"status-" + record.StatusName}>{text}</div>;
      },
    },
    {
      title: "",
      width: "14%",
      key: "Uuid",
      render: (text, record, index) => (
        <div className="btns">
          <span
            onClick={() => setSelectedItem(record)}
            className={`mini-btn ${
              record.StatusName !== "Completed" &&
              record.StatusName !== "Training"
                ? ""
                : "disabled"
            }`}>
            <span className="key" />
          </span>
          <span
            onClick={() => {
              window.open(
                `http://${record.Metadata.machineInfo.IP}:${record.Metadata.machineInfo.Port}`
              );
            }}
            className={`mini-btn ${
              record.StatusName !== "Completed" &&
              record.StatusName !== "Training"
                ? ""
                : "disabled"
            }`}>
            Console
          </span>
          <span onClick={() => navigate("/order/" + text)} className="mini-btn">
            Detail
          </span>
        </div>
      ),
    },
  ];
  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);
  return (
    <div className={className}>
      <table className="mytable">
        <thead className="table-thead">
          <tr>
            {columns.map((c) => {
              return (
                <th key={c.title} style={{ width: c.width }}>
                  {c.title}
                </th>
              );
            })}
          </tr>
        </thead>
        {list.length === 0 || isLoading ? (
          <tbody>
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center" }}>
                {isLoading ? (
                  <div className="spin-box">
                    <CircularProgress />
                  </div>
                ) : (
                  <span>No item yet</span>
                )}
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {list.map((d, index) => {
              return (
                <tr key={index}>
                  {columns.map((c, i) => {
                    if (c.render) {
                      return (
                        <td style={{ width: c.width }} key={i}>
                          {c.render(d[c.key], d, i)}
                        </td>
                      );
                    } else {
                      return (
                        <td key={i} style={{ width: c.width }}>
                          {d[c.key]}
                        </td>
                      );
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        )}
      </table>
      <Modal
        open={selectedItem}
        onClose={() => {
          setSelectedItem(null);
          setDecrypted(false);
        }}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 1000,
            bgcolor: "#00000b",
            boxShadow: 24,
            p: 4,
            borderRadius: "8px",
          }}>
          <h1 className="big-title">Decrypted SSH Key</h1>
          <div className="desc">
            <p>SSH Key was crypted by your public key.</p>
            <p>It can be decrypted and obtained with the wallet signature.</p>
          </div>
          <div>
            <h2
              className="con-title"
              style={{
                marginTop: "20px",
                marginBottom: "10px",
                fontWeight: "700",
              }}>
              SSH Key
            </h2>
            <div className={`crypted ${decrypted}`}>
              <span>
                {decrypted
                  ? selectedItem.Uuid
                  : "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
              </span>
              <div
                className={`hint ${decrypted}`}
                style={{ display: decrypted && "none" }}>
                Please decryted to show the SSH Key
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "20px",
            }}>
            <Button
              onClick={() => {
                if (!decrypted) {
                  setDecrypted(true);
                  enqueueSnackbar("Decrypted", { variant: "success" });
                } else {
                  copy(selectedItem.Uuid);
                  enqueueSnackbar("Copied to clipboard", {
                    variant: "success",
                  });
                }
              }}
              className="cbtn">
              {decrypted ? "Copy" : "Decrypted"}
            </Button>
          </div>
        </Box>
      </Modal>
    </div>
  );
}

export default styled(Header)`
  .spin-box {
    width: 100%;
    height: 50px;
    padding: 100px 0;
    display: block;
    overflow: hidden;
    text-align: center;
  }
  .price {
    display: flex;
    clear: both;
    flex-direction: row;
    align-items: center;
    img {
      width: 20px;
    }
    span {
      font-size: 14px;
      color: #ffffff;
      line-height: 20px;
      margin-left: 5px;
    }
  }
  .mytable {
    display: table;
    background-color: #222;
    border-radius: 10px;
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    overflow: hidden;
    font-size: 14px;
    line-height: 20px;
    .link {
      color: #fff;
      cursor: pointer;
    }
    .btn-link {
      color: #fff;
      cursor: pointer;
      text-decoration: underline;
    }
    th {
      background-color: #151515;
      color: #fff;
      height: 37px;
      line-height: 18px;
      text-align: left;
      padding: 8px 10px;
      font-weight: normal;
    }
    tr td {
      border-bottom: 1px solid #1a1a1a;
      border-collapse: collapse;
      padding: 20px 10px;
      overflow: hidden;
    }
    tr:last-children {
      td {
        border-bottom: none;
      }
    }
  }
  .total {
    display: flex;
    flex-direction: column;
    label {
      font-weight: 700;
      font-style: normal;
      font-size: 14px;
      color: #ffffff;
      text-align: left;
    }
    span {
      padding: 1px;
      background-color: #000;
      color: #797979;
      font-size: 12px;
      border-radius: 6px;
      width: 31px;
      text-align: center;
    }
  }
  .status-Training {
    color: #faf177;
  }
  .status-Available {
    color: #bdff95;
  }
  .status-Completed {
    color: #878787;
  }
  .status-Failed {
    color: #ffb9b9;
  }
  .btns {
    display: flex;
    justify-content: space-between;
  }
  .key {
    padding: 5px 15px;
    background-image: url("/img/key.png");
    background-position: center;
    background-size: 70%;
    background-repeat: no-repeat;
  }
  .disabled {
    background-image: none;
    background-color: #4a4a4a;
    opacity: 0.5;
    pointer-events: none;
  }
  .disabled:hover {
    background-color: #4a4a4a !important;
    opacity: 0.5 !important;
  }
  .mini-btn {
    border-radius: 4px;
    border: none;
    height: 31px;
    line-height: 31px;
    padding: 0 10px;
    font-size: 14px;
    display: block;
    text-align: center;
    overflow: hidden;
    margin-right: 10px;
    float: right;
    :hover {
      border: none;
    }
    background-image: linear-gradient(to right, #20ae98, #0aab50);
    color: white;
    cursor: pointer;
  }
`;
