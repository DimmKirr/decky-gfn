import { staticClasses } from "@decky/ui";
import { definePlugin, routerHook } from "@decky/api";
import { SiNvidia } from "react-icons/si";
import { QamPanel } from "./components/QamPanel";
import { CatalogPage } from "./components/CatalogPage";
import { ServicesProvider } from "./services";
import { makeRealServices } from "./services.real";

export default definePlugin(() => {
  const services = makeRealServices();

  routerHook.addRoute(
    "/gfn-catalog",
    () => (
      <ServicesProvider value={services}>
        <CatalogPage />
      </ServicesProvider>
    ),
    { exact: true },
  );

  return {
    name: "GeForce NOW",
    titleView: <div className={staticClasses.Title}>GeForce NOW</div>,
    content: (
      <ServicesProvider value={services}>
        <QamPanel />
      </ServicesProvider>
    ),
    icon: <SiNvidia />,
    onDismount() {
      routerHook.removeRoute("/gfn-catalog");
    },
  };
});
