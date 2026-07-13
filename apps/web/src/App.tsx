import {
  Activity,
  Boxes,
  Check,
  ChevronDown,
  Filter,
  Flame,
  GitBranch,
  KeyRound,
  Layers3,
  Minus,
  Moon,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  Sun,
} from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

type Theme = "dark" | "light";

type Bundle = {
  id: string;
  platform: string;
  shouldForceUpdate: boolean;
  enabled: boolean;
  channel: string;
  targetAppVersion: string | null;
  rolloutCohortCount: number;
  patchesCount?: number;
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

  const channelOptions = useMemo(() => {
    const values = new Set(bundles.map((bundle) => bundle.channel).filter(Boolean));
    return [...values].sort((left, right) => left.localeCompare(right));
  }, [bundles]);

  const visibleBundles = useMemo(() => bundles.filter((bundle) => (
    (!platform || bundle.platform === platform) &&
    (!channel || bundle.channel === channel)
  )), [bundles, channel, platform]);

  const activeBundleCount = useMemo(
    () => bundles.filter((bundle) => bundle.enabled).length,
    [bundles],
  );

  const averageRollout = useMemo(() => {
    if (!bundles.length) return 0;
    const total = bundles.reduce(
      (sum, bundle) => sum + Number(bundle.rolloutCohortCount ?? 1000) / 10,
      0,
    );
    return Math.round(total / bundles.length);
  }, [bundles]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("hot-updater-theme", nextTheme);
  }

  async function loadBundles(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    const authToken = token.trim();

    try {
      const response = await fetch(`${apiBaseUrl}/dashboard/api/bundles?limit=100`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const payload = await response.json() as DashboardResponse;
      if (!response.ok) throw new Error(payload.error || payload.message || "Request failed");
      setBundles(payload.data || []);
      setLoaded(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const connectionState = error ? "error" : loaded ? "ready" : "idle";

  return (
    <div className="app" data-theme={theme}>
      <main className="workspace">
        <header className="topbar">
          <a className="topbar-brand" href="/dashboard/" aria-label="Hot Updater Dashboard">
            <span className="topbar-brand-mark"><Flame /></span>
            <span className="topbar-brand-copy">
              <strong>Hot Updater</strong>
              <small>Dashboard</small>
            </span>
          </a>

          <button
            className="topbar-theme-button"
            type="button"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>

          <div className={`connection-badge ${connectionState}`}>
            <span className="status-dot" />
            <span>{error ? "Connection issue" : loaded ? "Inventory synced" : "Ready to connect"}</span>
          </div>
        </header>

        <div className="page-shell">
          <section className="page-heading">
            <div>
              <span className="eyebrow"><Activity />Release control</span>
              <h1>Bundle inventory</h1>
            </div>
            <div className="heading-meta">
              <span>Environment</span>
              <strong><Server />Self-hosted</strong>
            </div>
          </section>

          <section className="metric-grid" aria-label="Inventory overview">
            <MetricCard
              accent="blue"
              icon={<Layers3 />}
              label="Loaded bundles"
              value={loaded ? String(bundles.length) : "--"}
              detail="Current inventory"
            />
            <MetricCard
              accent="green"
              icon={<ShieldCheck />}
              label="Active releases"
              value={loaded ? String(activeBundleCount) : "--"}
              detail={loaded && bundles.length ? `${Math.round((activeBundleCount / bundles.length) * 100)}% enabled` : "Release status"}
            />
            <MetricCard
              accent="violet"
              icon={<GitBranch />}
              label="Channels"
              value={loaded ? String(channelOptions.length) : "--"}
              detail={loaded && channelOptions.length ? channelOptions.join(", ") : "Deployment lanes"}
            />
            <MetricCard
              accent="amber"
              icon={<Rocket />}
              label="Average rollout"
              value={loaded ? `${averageRollout}%` : "--"}
              detail="Across loaded bundles"
            />
          </section>

          <form className="control-panel" onSubmit={loadBundles}>
            <div className="filter-title">
              <span className="control-icon"><Filter /></span>
              <span><strong>Filters</strong><small>Refine inventory</small></span>
            </div>

            <div className="select-wrap">
              <select value={platform} onChange={(event) => setPlatform(event.target.value)} aria-label="Platform">
                <option value="">All platforms</option>
                <option value="ios">iOS</option>
                <option value="android">Android</option>
              </select>
              <ChevronDown />
            </div>

            <div className="select-wrap">
              <select value={channel} onChange={(event) => setChannel(event.target.value)} aria-label="Channel">
                <option value="">All channels</option>
                {channelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <ChevronDown />
            </div>

            <label className="token-field">
              <KeyRound />
              <input
                type="password"
                autoComplete="off"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Authorization token"
                aria-label="Authorization token"
              />
            </label>

            <button className="load-button" type="submit" disabled={loading}>
              <RefreshCw className={loading ? "spinning" : ""} />
              <span>{loading ? "Loading" : "Load bundles"}</span>
            </button>
          </form>

          {error && <div className="error" role="alert"><span className="status-dot error" />{error}</div>}

          <section className="table-panel">
            <header className="table-header">
              <div className="table-title">
                <span className="table-icon"><Boxes /></span>
                <span>
                  <strong>Bundle records</strong>
                  <small>{loaded ? `${visibleBundles.length} visible of ${bundles.length} loaded` : "Inventory not loaded"}</small>
                </span>
              </div>
              <span className={`live-state ${connectionState}`}>
                <span className="status-dot" />
                {loaded ? "Live inventory" : "Standby"}
              </span>
            </header>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Bundle ID</th>
                    <th>Version</th>
                    <th>Platform</th>
                    <th>Target</th>
                    <th>Enabled</th>
                    <th>Force Update</th>
                    <th>Channel</th>
                    <th>Patches</th>
                    <th>Rollout</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBundles.map((bundle) => <BundleRow key={bundle.id} bundle={bundle} />)}
                  {!visibleBundles.length && (
                    <tr>
                      <td className="empty" colSpan={9}>
                        <span className="empty-icon"><Layers3 /></span>
                        <strong>{loaded ? "No bundles in this view" : "Inventory is ready"}</strong>
                        <small>{loaded ? "0 records match the selected scope." : "No records loaded yet."}</small>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="pager">
              <span>Showing <strong>{visibleBundles.length}</strong> of <strong>{bundles.length}</strong> entries</span>
              <span>Page <strong>1</strong> of <strong>1</strong></span>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  accent,
  icon,
  label,
  value,
  detail,
}: {
  accent: "blue" | "green" | "violet" | "amber";
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={`metric-card ${accent}`}>
      <span className="metric-icon">{icon}</span>
      <span className="metric-copy">
        <small>{label}</small>
        <strong>{value}</strong>
        <span title={detail}>{detail}</span>
      </span>
    </article>
  );
}

function BundleRow({ bundle }: { bundle: Bundle }) {
  const patchCount = Number(bundle.patchesCount ?? 0);
  const rollout = `${Number(bundle.rolloutCohortCount ?? 1000) / 10}%`;

  return (
    <tr>
      <td className="mono bundle-id" title={bundle.id}>{bundle.id}</td>
      <td className="mono version-cell"><span className="version-badge">{bundle.version ?? "-"}</span></td>
      <td><span className="platform"><Smartphone />{formatPlatform(bundle.platform)}</span></td>
      <td><span className="target">{bundle.targetAppVersion ?? "-"}</span></td>
      <td>{bundle.enabled ? <CheckState /> : <EmptyState />}</td>
      <td>{bundle.shouldForceUpdate ? <CheckState /> : <EmptyState />}</td>
      <td><span className="channel-pill">{bundle.channel}</span></td>
      <td>{patchCount > 0 ? <span className="patch-pill">{patchCount} patch{patchCount === 1 ? "" : "es"}</span> : <span className="muted">-</span>}</td>
      <td><span className="rollout">{rollout}</span></td>
    </tr>
  );
}

function CheckState() {
  return <span className="state state-on" title="Yes"><Check /></span>;
}

function EmptyState() {
  return <span className="state state-off" title="No"><Minus /></span>;
}

function formatPlatform(platform: string) {
  return platform.toLowerCase() === "ios" ? "iOS" : "Android";
}
