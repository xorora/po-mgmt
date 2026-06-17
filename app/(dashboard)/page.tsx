import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardData } from "@/lib/services/dashboard";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MetricCard({
  title,
  value,
  description,
  href,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block h-full">
      <Card className="h-full transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground group-hover:text-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of vendors, parts, products, and vendor purchase orders."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/vendor-pos">Create vendor PO</Link>
        </Button>
      </PageHeader>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Vendors"
          value={data.vendorCount}
          description="Supplier records"
          href="/vendors"
        />
        <MetricCard
          title="Parts"
          value={data.partCount}
          description="Parts catalog"
          href="/parts"
        />
        <MetricCard
          title="Products"
          value={data.productCount}
          description="Products with BOM reference"
          href="/products"
        />
        <MetricCard
          title="Vendor POs"
          value={data.vendorPoCount}
          description="Purchase orders to vendors"
          href="/vendor-pos"
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-medium">
              Recent vendor POs
            </h2>
            <p className="text-sm text-muted-foreground">
              Latest purchase orders created for vendors.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/vendor-pos">View all</Link>
          </Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentVendorPos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No vendor POs yet. Create one from the vendor POs page.
                  </TableCell>
                </TableRow>
              ) : (
                data.recentVendorPos.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>
                      <Link
                        href={`/vendor-pos/${po.id}`}
                        className="font-medium hover:underline"
                      >
                        PO #{po.id}
                      </Link>
                    </TableCell>
                    <TableCell>{po.vendorName}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      v{po.versionNumber}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {po.lineCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(po.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
