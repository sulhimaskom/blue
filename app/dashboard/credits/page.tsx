"use client";

import { useState } from "react";
import Link from "next/link";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCreditsData } from "@/lib/hooks/use-dashboard-data";
import { PRICING_PACKAGES } from "@/lib/constants";

export default function CreditsPage() {
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<
    (typeof PRICING_PACKAGES)[number] | null
  >(null);

  const {
    data: creditsData,
    loading,
    error,
    purchaseLoading,
    refetch,
    purchaseCredits,
  } = useCreditsData();

  const handlePurchase = async (
    packageData: (typeof PRICING_PACKAGES)[number],
  ) => {
    setSelectedPackage(packageData);
    setPurchaseModalOpen(true);
  };

  const confirmPurchase = async () => {
    if (!selectedPackage) return;

    try {
      // Convert price string to cents amount
      const priceString = selectedPackage.price.replace(/[^0-9.]/g, "");
      const amount = Math.round(parseFloat(priceString) * 100);

      await purchaseCredits(amount, "mock_payment_method", true);

      setPurchaseModalOpen(false);
      setSelectedPackage(null);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !creditsData) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error</h2>
            <p className="text-red-600">
              {error || "Unable to load credits data"}
            </p>
            <Button onClick={refetch} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Credits Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your credits, view transaction history, and purchase
            additional credits.
          </p>
        </header>

        {/* Current Balance Section */}
        <section className="mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Current Balance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Available Credits</p>
                <p className="text-3xl font-bold text-blue-600">
                  {creditsData.credits}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Subscription Tier</p>
                <p className="text-xl font-semibold capitalize text-gray-900">
                  {creditsData.subscriptionTier}
                </p>
                <Link
                  href="/dashboard/subscription"
                  className="inline-flex items-center mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Manage Subscription →
                </Link>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Credit Value</p>
                <p className="text-xl font-semibold text-gray-900">
                  {creditsData.pricing.creditValue}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Packages */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Purchase Credits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_PACKAGES.map((pkg, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {pkg.credits} Credits
                </h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">
                  {pkg.price}
                </p>
                <Button
                  onClick={() => handlePurchase(pkg)}
                  className="w-full"
                  variant={pkg.credits >= 500 ? "default" : "secondary"}
                >
                  {pkg.credits >= 500 ? "Get Pro" : "Purchase"}
                </Button>
                {pkg.credits >= 500 && (
                  <p className="text-xs text-green-600 mt-2">
                    Includes Pro tier
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Transaction History */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Transaction History
            </h2>
            <Button onClick={refetch} variant="outline" size="sm">
              Refresh
            </Button>
          </div>

          <div className="bg-white overflow-hidden rounded-lg border border-gray-200">
            {creditsData.transactions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No transactions yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Purchase credits to see your transaction history
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credits Added
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transaction ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {creditsData.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          +{transaction.creditsAdded}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${transaction.amount / 100}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.paymentId || transaction.id.slice(0, 8)}
                          ...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Purchase Confirmation Modal */}
        <Modal
          isOpen={purchaseModalOpen}
          onClose={() => {
            setPurchaseModalOpen(false);
            setSelectedPackage(null);
          }}
          title="Confirm Purchase"
          size="md"
        >
          <div className="space-y-4">
            {selectedPackage && (
              <div>
                <p className="text-gray-600">You are about to purchase:</p>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold">
                    {selectedPackage.credits} Credits
                  </p>
                  <p className="text-lg font-bold text-blue-600">
                    {selectedPackage.price}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {!creditsData.stripeConfig.configured && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-600">
                  Note: Stripe is not configured. This will use a mock payment
                  method for development.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setPurchaseModalOpen(false);
                setSelectedPackage(null);
              }}
              disabled={purchaseLoading}
            >
              Cancel
            </Button>
            <Button onClick={confirmPurchase} disabled={purchaseLoading}>
              {purchaseLoading ? "Processing..." : "Confirm Purchase"}
            </Button>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
