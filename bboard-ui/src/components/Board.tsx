// SPDX-License-Identifier: Apache-2.0

import React, { useCallback, useEffect, useState } from "react";
import { type ContractAddress } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import {
  Backdrop,
  CircularProgress,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  Skeleton,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  Alert,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import SendIcon from "@mui/icons-material/SendOutlined";
import CopyIcon from "@mui/icons-material/ContentPasteOutlined";
import StopIcon from "@mui/icons-material/HighlightOffOutlined";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { type TipJarDerivedState, type DeployedTipJarAPI } from "../../../api/src/index.js";
import { useDeployedBoardContext } from "../hooks/index.js";
import { type BoardDeployment } from "../contexts/index.js";
import { type Observable } from "rxjs";
import { EmptyCardContent } from "./Board.EmptyCardContent.js";

export interface BoardProps {
  boardDeployment$?: Observable<BoardDeployment>;
}

export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<DeployedTipJarAPI>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [boardState, setBoardState] = useState<TipJarDerivedState>();
  const [messagePrompt, setMessagePrompt] = useState<string>("");
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);

  const onCreateBoard = useCallback(() => boardApiProvider.resolve(), [boardApiProvider]);
  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => boardApiProvider.resolve(contractAddress),
    [boardApiProvider],
  );

  const onSendTip = useCallback(async () => {
    if (!messagePrompt) return;
    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        await deployedBoardAPI.tip(messagePrompt);
        setMessagePrompt("");
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, messagePrompt]);

  const onWithdraw = useCallback(async () => {
    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        await deployedBoardAPI.withdraw();
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedBoardAPI) {
      await navigator.clipboard.writeText(deployedBoardAPI.deployedContractAddress);
    }
  }, [deployedBoardAPI]);

  useEffect(() => {
    if (!boardDeployment$) return;
    const subscription = boardDeployment$.subscribe(setBoardDeployment);
    return () => subscription.unsubscribe();
  }, [boardDeployment$]);

  useEffect(() => {
    if (!boardDeployment || boardDeployment.status === "in-progress") return;
    setIsWorking(false);
    if (boardDeployment.status === "failed") {
      setErrorMessage(
        boardDeployment.error.message.length ? boardDeployment.error.message : "Encountered an unexpected error.",
      );
      return;
    }
    setDeployedBoardAPI(boardDeployment.api);
    const subscription = boardDeployment.api.state$.subscribe(setBoardState);
    return () => subscription.unsubscribe();
  }, [boardDeployment]);

  return (
    <Card sx={{ position: "relative", width: 340, minHeight: 380, borderRadius: 3, boxShadow: 4, background: "#111827", border: "1px solid #374151" }}>
      {!boardDeployment$ && (
        <EmptyCardContent onCreateBoardCallback={onCreateBoard} onJoinBoardCallback={onJoinBoard} />
      )}

      {boardDeployment$ && (
        <React.Fragment>
          <Backdrop
            sx={{ position: "absolute", color: "#6366f1", zIndex: (theme) => theme.zIndex.drawer + 1, borderRadius: 3 }}
            open={isWorking}
          >
            <CircularProgress color="inherit" />
          </Backdrop>
          <Backdrop
            sx={{ position: "absolute", color: "#ef4444", zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: "column", p: 2, borderRadius: 3 }}
            open={!!errorMessage}
          >
            <StopIcon fontSize="large" sx={{ mb: 1 }} />
            <Typography variant="body2" align="center" sx={{ color: "#fff" }}>
              {errorMessage}
            </Typography>
            <Button size="small" variant="contained" color="error" sx={{ mt: 2 }} onClick={() => setErrorMessage(undefined)}>
              Dismiss
            </Button>
          </Backdrop>

          <CardHeader
            avatar={
              boardState ? (
                boardState.isActive ? (
                  <Chip icon={<LockOpenIcon sx={{ fontSize: "16px !important" }} />} label="ACTIVE" size="small" color="success" />
                ) : (
                  <Chip icon={<LockIcon sx={{ fontSize: "16px !important" }} />} label="CLOSED" size="small" color="default" />
                )
              ) : (
                <Skeleton variant="rectangular" width={60} height={24} />
              )
            }
            title={toShortFormatContractAddress(deployedBoardAPI?.deployedContractAddress) ?? "Connecting..."}
            titleTypographyProps={{ color: "#f9fafb", fontWeight: 600, fontSize: "0.9rem" }}
            action={
              deployedBoardAPI?.deployedContractAddress ? (
                <IconButton title="Copy contract address" onClick={onCopyContractAddress} sx={{ color: "#9ca3af" }}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              ) : (
                <Skeleton variant="circular" width={20} height={20} />
              )
            }
          />

          <CardContent sx={{ pt: 0 }}>
            {boardState ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ background: "#1f2937", p: 2, borderRadius: 2, textAlign: "center" }}>
                  <Typography variant="caption" sx={{ color: "#9ca3af", textTransform: "uppercase", tracking: 1 }}>
                    Total Tips Received
                  </Typography>
                  <Typography variant="h4" sx={{ color: "#38bdf8", fontWeight: 700, mt: 0.5 }}>
                    {boardState.totalTips.toString()}
                  </Typography>
                </Box>

                {boardState.isOwner && (
                  <Alert severity="info" sx={{ background: "#1e1b4b", color: "#c7d2fe", border: "1px solid #4338ca" }}>
                    You are the Jar Owner (ZK Verified)
                  </Alert>
                )}

                {boardState.isActive ? (
                  <TextField
                    id="tip-message-prompt"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Write an encouragement or tip note..."
                    size="small"
                    value={messagePrompt}
                    sx={{
                      background: "#1f2937",
                      borderRadius: 1,
                      input: { color: "#fff" },
                      textarea: { color: "#fff" },
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "#374151" },
                    }}
                    onChange={(e) => setMessagePrompt(e.target.value)}
                  />
                ) : (
                  <Typography variant="body2" sx={{ color: "#9ca3af", textAlign: "center", py: 2 }}>
                    This Tip Jar has been withdrawn and closed.
                  </Typography>
                )}
              </Box>
            ) : (
              <Skeleton variant="rectangular" width="100%" height={160} />
            )}
          </CardContent>

          <CardActions sx={{ px: 2, pb: 2, justifyContent: "space-between" }}>
            {deployedBoardAPI && boardState ? (
              <React.Fragment>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  disabled={!boardState.isActive || !messagePrompt.trim()}
                  sx={{ background: "#6366f1", "&:hover": { background: "#4f46e5" } }}
                  onClick={onSendTip}
                >
                  Send Tip
                </Button>
                {boardState.isOwner && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<AccountBalanceWalletIcon />}
                    disabled={!boardState.isActive}
                    onClick={onWithdraw}
                  >
                    Withdraw
                  </Button>
                )}
              </React.Fragment>
            ) : (
              <Skeleton variant="rectangular" width="100%" height={36} />
            )}
          </CardActions>
        </React.Fragment>
      )}
    </Card>
  );
};

const toShortFormatContractAddress = (contractAddress: ContractAddress | undefined): React.ReactElement | undefined =>
  contractAddress ? (
    <span data-testid="board-address">
      0x{contractAddress.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{6}).*([A-Fa-f0-9]{6})$/g, "$1...$2")}
    </span>
  ) : undefined;
