import { useEffect, useState } from "react";
import type { Blockchain, SignedWalletDescriptor } from "@coral-xyz/common";
import {
  getAuthMessage,
  UI_RPC_METHOD_SIGN_MESSAGE_FOR_PUBLIC_KEY,
  UI_RPC_METHOD_USER_JWT_UPDATE,
} from "@coral-xyz/common";
import { useBackgroundClient, useUser } from "@coral-xyz/recoil";
import { ethers } from "ethers";

import { useAuthentication } from "../../hooks/useAuthentication";
import { WithDrawer } from "../common/Layout/Drawer";
import { HardwareOnboard } from "../Onboarding/pages/HardwareOnboard";

export function WithAuth({ children }: { children: React.ReactElement }) {
  const { authenticate, checkAuthentication, getAuthSigner } =
    useAuthentication();
  const background = useBackgroundClient();
  const user = useUser();

  const [authData, setAuthData] = useState<{
    publicKey: string;
    blockchain: Blockchain;
    hardware: boolean;
    message: string;
    userId: string;
  } | null>(null);
  const [authSignature, setAuthSignature] = useState<string | null>(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [serverAccountState, setServerAccountState] = useState<{
    isAuthenticated: boolean;
    publicKeys: Array<{ blockchain: Blockchain; publicKey: string }>;
  } | null>(null);

  /**
   * Check authentication status and take required actions to authenticate if
   * not authenticated.
   */
  useEffect(() => {
    (async () => {
      setAuthSignature(null);
      const result = await checkAuthentication(user.username, user.jwt);
      // These set state calls should be batched
      if (result) {
        const { isAuthenticated, publicKeys } = result;
        setServerAccountState({
          // If user.jwt is empty we should authenticate again
          isAuthenticated: isAuthenticated && user.jwt !== "",
          publicKeys,
        });
      }
    })();
    // Rerun authentication on user changes
  }, [user]);

  /**
   * If the user is not authenticated, find a signer that exists on the client
   * and the server and set the auth data.
   */
  useEffect(() => {
    if (serverAccountState) {
      if (!serverAccountState.isAuthenticated) {
        (async () => {
          const authData = await getAuthSigner(
            serverAccountState.publicKeys.map((p) => p.publicKey)
          );
          if (authData) {
            setAuthData({
              ...authData,
              message: getAuthMessage(user.uuid),
              userId: user.uuid,
            });
          }
        })();
      }
    }
  }, [serverAccountState]);

  /**
   * When an auth signer is found, take the required action to get a signature.
   */
  useEffect(() => {
    (async () => {
      if (authData) {
        if (!authData.hardware) {
          // Auth signer is not a hardware wallet, sign transparent
          const signature = await background.request({
            method: UI_RPC_METHOD_SIGN_MESSAGE_FOR_PUBLIC_KEY,
            params: [
              authData.blockchain,
              authData.publicKey,
              ethers.utils.base58.encode(
                Buffer.from(authData.message, "utf-8")
              ),
            ],
          });
          setAuthSignature(signature);
        } else {
          // Auth signer is a hardware wallet, pop up a drawer to guide through
          // flow
          setOpenDrawer(true);
        }
      }
    })();
  }, [authData]);

  /**
   * When an auth signature is created, authenticate with it.
   */
  useEffect(() => {
    (async () => {
      if (authData && authSignature) {
        const { id, jwt } = await authenticate({
          ...authData,
          signature: authSignature,
        });
        await background.request({
          method: UI_RPC_METHOD_USER_JWT_UPDATE,
          params: [id, jwt],
        });
        setOpenDrawer(false);
      }
    })();
  }, [authData, authSignature]);

  return (
    <>
      {children}
      {authData && (
        <WithDrawer
          openDrawer={openDrawer}
          setOpenDrawer={setOpenDrawer}
          paperStyles={{
            height: "calc(100% - 56px)",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
          }}
        >
          <HardwareOnboard
            blockchain={authData!.blockchain}
            action="search"
            searchPublicKey={authData!.publicKey}
            signMessage={authData!.message}
            signText="Sign the message to authenticate with Backpack."
            onComplete={(signedWalletDescriptor: SignedWalletDescriptor) => {
              setAuthSignature(signedWalletDescriptor.signature);
            }}
          />
        </WithDrawer>
      )}
    </>
  );
}
