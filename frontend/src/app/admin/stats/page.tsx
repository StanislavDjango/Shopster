import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { fetchStatsOverview } from "@/lib/adminApi";

export const metadata = {
  title: "Admin dashboard",
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type StatsPageProps = {
  searchParams?: Promise<SearchParams>;
};

function normalizeParam(value?: string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function formatDateInput(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString().slice(0, 10);
  } catch {
    return undefined;
  }
}

export default async function AdminStatsPage({ searchParams }: StatsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect(`/signin?callbackUrl=/admin/stats`);
  }

  if (!session.user.is_staff) {
    redirect("/");
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    redirect(`/signin?callbackUrl=/admin/stats`);
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const dateFromParam = normalizeParam(resolvedSearchParams?.date_from);
  const dateToParam = normalizeParam(resolvedSearchParams?.date_to);

  const query = {
    dateFrom: dateFromParam,
    dateTo: dateToParam,
  };

  let stats;
  try {
    stats = await fetchStatsOverview(accessToken, query);
  } catch (error) {
    console.error("Failed to load stats", error);
    return (
      <section className="section">
        <div className="container admin-stats">
          <h1>Admin dashboard</h1>
          <p className="stats-error">
            Failed to load statistics. Please try again later.
          </p>
        </div>
      </section>
    );
  }

  const dateFromInput = formatDateInput(dateFromParam);
  const dateToInput = formatDateInput(dateToParam);

  return (
    <section className="section">
      <div className="container admin-stats">
        <div className="stats-header">
          <div>
            <h1>Admin dashboard</h1>
            <p className="stats-description">
              Sales overview and product performance.
            </p>
          </div>
        </div>

        <form method="get" className="stats-filters">
          <label>
            <span>From</span>
            <input type="date" name="date_from" defaultValue={dateFromInput} />
          </label>
          <label>
            <span>To</span>
            <input type="date" name="date_to" defaultValue={dateToInput} />
          </label>
          <div className="stats-filters__actions">
            <button type="submit" className="btn btn-primary">
              Apply
            </button>
            <a href="/admin/stats" className="btn btn-secondary">
              Reset
            </a>
          </div>
        </form>

        <div className="stats-cards">
          <div className="stats-card">
            <span>Total orders</span>
            <strong>{stats.total_orders}</strong>
          </div>
          <div className="stats-card">
            <span>Gross revenue (all currencies)</span>
            <strong>{stats.gross_revenue}</strong>
          </div>
        </div>

        <div className="stats-section">
          <h2>Totals by currency</h2>
          {stats.currency_breakdown.length === 0 ? (
            <p className="stats-empty">No data for the selected period.</p>
          ) : (
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Total sales</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {stats.currency_breakdown.map((item) => (
                  <tr key={item.currency}>
                    <td>{item.currency}</td>
                    <td>{item.total_sales}</td>
                    <td>{item.total_orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="stats-section">
          <h2>Top products</h2>
          {stats.top_products.length === 0 ? (
            <p className="stats-empty">
              No products sold during the selected period.
            </p>
          ) : (
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Total sales</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_products.map((product) => (
                  <tr key={`${product.product_id}-${product.product_name}`}>
                    <td>{product.product_name}</td>
                    <td>{product.total_quantity}</td>
                    <td>{product.total_sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
