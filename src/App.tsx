/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-nested-ternary */
import { FC, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import WebAppSDK from "@twa-dev/sdk";

// import { useTonAddress } from '@tonconnect/ui-react'
import { AppInner } from "@delab-team/de-ui";

import { Home } from "./pages/home";

import { ROUTES } from "./utils/router";

import { Layout } from "./layout";

declare global {
  interface Window {
    Telegram?: any;
  }
}

export const App: FC = () => {
  const [firstRender, setFirstRender] = useState<boolean>(false);
  const [isTg, setIsTg] = useState<boolean>(false);

  useEffect(() => {
    if (!firstRender) {
      setFirstRender(true);

      const isTgCheck = window.Telegram.WebApp.initData !== "";

      if (isTgCheck) {
        WebAppSDK.ready();
        WebAppSDK.enableClosingConfirmation();
        WebAppSDK.expand();
        setIsTg(true);
      }
    }
  }, []);

  return (
    <AppInner isTg={isTg}>
      <Layout>
        <Routes>
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AppInner>
  );
};
