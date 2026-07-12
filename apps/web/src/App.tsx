import {
  CheckCircle2,
  GitBranch,
  KeyRound,
  ListTree,
  Moon,
  Package,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  SquareTerminal,
  Sun,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Theme = "dark" | "light";

type Bundle = {
  id: string;
  platform: string;
  shouldForceUpdate: boolean;
  enabled: boolean;
  channel: string;
  targetAppVersion: string | null;
  rolloutCohortCount: number;
  version: number | null;
};

type DashboardResponse = { data: Bundle[]; error?: string; message?: string };

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

function getInitialTheme(): Theme {
  return localStorage.getItem("hot-updater-theme") === "light" ? "light" : "dark";
}

export function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [token, setToken] = useState("");
  const [platform, setPlatform] = useState("");
  const [channel, setChannel] = useState("");
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const metrics = useMemo(() => ({
    total: bundles.length,
    enabled: bundles.filter((bundle) => bundle.enabled).length,
    force: bundles.filter((bundle) => bundle.shouldForceUpdate).length,
    channels: new Set(bundles.map((bundle) => bundle.channel)).size,
  }), [bundles]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("hot-updater-theme", nextTheme);
  }

  async function loadBundles(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "100" });
    if (platform) params.set("platform", platform);
    if (channel.trim()) params.set("channel", channel.trim());

    try {
      const response = await fetch(`${apiBaseUrl}/dashboard/api/bundles?${params}`, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      const payload = await response.json() as DashboardResponse;
      if (!response.ok) throw new Error(payload.error || payload.message || "Request failed");
      setBundles(payload.data || []);
      setLoaded(true);
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <div className="shell topbar-inner">
          <div className="brand">
            <span className="brand-mark"><RadioTower /></span>
            <span><strong>Hot Updater</strong><small>release control / react</small></span>
          </div>
          <div className="top-actions">
            <button className="icon-button" type="button" onClick={toggleTheme} title="Change theme" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
              {theme === "dark" ? <Sun /> : <Moon />}
            </button>
            <span className={`connection ${error ? "connection-error" : ""}`}><i />{error ? "API unavailable" : "API ready"}</span>
          </div>
        </div>
      </header>

      <main className="shell main">
        <section className="heading-row">
          <div><p className="eyebrow"><SquareTerminal />Bundle operations</p><h1>Release control.</h1></div>
          <p className="heading-copy">A focused view of bundle versions, rollout state and release channels.</p>
        </section>

        <section className="metrics" aria-label="Bundle summary">
          <Metric icon={<Package />} label="Total bundles" value={metrics.total} tone="mint" />
          <Metric icon={<CheckCircle2 />} label="Enabled" value={metrics.enabled} />
          <Metric icon={<ShieldAlert />} label="Force update" value={metrics.force} tone="coral" />
          <Metric icon={<GitBranch />} label="Channels" value={metrics.channels} tone="amber" />
        </section>

        <form className="controls" onSubmit={loadBundles}>
          <label><span><KeyRound />Authorization token</span><input type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} placeholder="HOT_UPDATER_AUTH_TOKEN" /></label>
          <label><span>Platform</span><select value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="">All platforms</option><option value="ios">iOS</option><option value="android">Android</option></select></label>
          <label><span>Channel</span><input value={channel} onChange={(event) => setChannel(event.target.value)} placeholder="All channels" /></label>
          <button className="load-button" type="submit" disabled={loading}><Sparkles />{loading ? "Loading" : "Load bundles"}</button>
        </form>

        <section className="inventory">
          <header className="inventory-head">
            <div className="inventory-title"><ListTree />Bundle inventory</div>
            <div className="inventory-meta"><span>{bundles.length} record{bundles.length === 1 ? "" : "s"}</span><span>{updatedAt || "Not loaded"}</span><button className="icon-button" type="button" onClick={() => loadBundles()} title="Refresh bundles" aria-label="Refresh bundles"><RefreshCw /></button></div>
          </header>
          {error && <div className="error" role="alert">{error}</div>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Version</th><th>Bundle ID</th><th>Platform</th><th>App version</th><th>Channel</th><th>Status</th><th>Force</th><th>Rollout</th></tr></thead>
              <tbody>
                {bundles.map((bundle) => <BundleRow key={bundle.id} bundle={bundle} />)}
                {!bundles.length && <tr><td colSpan={8} className="empty">{loaded ? "No bundles match the current filters." : "Enter your token to load release data."}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <footer className="footer"><span>POSTGRESQL + AWS S3</span><span><i />{loading ? "Fetching bundles" : loaded ? "Data current" : "Awaiting request"}</span></footer>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, tone = "" }: { icon: React.ReactNode; label: string; value: number; tone?: string }) {
  return <article className="metric"><span className="metric-label">{icon}{label}</span><strong className={`metric-value ${tone}`}>{value}</strong></article>;
}

function BundleRow({ bundle }: { bundle: Bundle }) {
  return (
    <tr>
      <td className="version">{bundle.version ?? "-"}</td>
      <td className="muted mono" title={bundle.id}>{bundle.id}</td>
      <td className="platform">{bundle.platform.toUpperCase()}</td>
      <td>{bundle.targetAppVersion ?? "-"}</td>
      <td>{bundle.channel}</td>
      <td><span className={`status ${bundle.enabled ? "status-on" : "status-off"}`}>{bundle.enabled ? "Enabled" : "Disabled"}</span></td>
      <td>{bundle.shouldForceUpdate ? "Yes" : "No"}</td>
      <td>{Number(bundle.rolloutCohortCount ?? 1000) / 10}%</td>
    </tr>
  );
}
