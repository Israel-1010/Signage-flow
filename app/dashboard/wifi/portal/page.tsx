import { Metadata } from "next";
import { WifiPortalPage } from "@/components/wifi/portal-page";

export const metadata: Metadata = {
  title: "Portal Wi-Fi",
};

export default function Page() {
  return <WifiPortalPage />;
}
