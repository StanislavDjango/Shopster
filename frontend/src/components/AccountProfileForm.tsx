"use client";

import { useSession } from "next-auth/react";
import { FormEvent, useState } from "react";

import { API_BASE_URL } from "@/lib/config";

type ProfileData = {
  first_name?: string;
  last_name?: string;
  profile?: {
    phone?: string;
    default_shipping_address?: string;
    default_shipping_city?: string;
    default_shipping_postcode?: string;
    default_shipping_country?: string;
  };
};

type Props = {
  initialData: ProfileData;
};

export function AccountProfileForm({ initialData }: Props) {
  const { data: session } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.accessToken) {
      setError("Session expired. Please sign in again.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      first_name: formData.get("first_name") || "",
      last_name: formData.get("last_name") || "",
      profile: {
        phone: formData.get("phone") || "",
        default_shipping_address:
          formData.get("default_shipping_address") || "",
        default_shipping_city: formData.get("default_shipping_city") || "",
        default_shipping_postcode:
          formData.get("default_shipping_postcode") || "",
        default_shipping_country:
          formData.get("default_shipping_country") || "",
      },
    };

    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          typeof errorData === "object" && errorData
            ? Object.values(errorData as Record<string, string[]>)
                .flat()
                .join(" ")
            : "Unable to save profile.",
        );
      }
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const profile = initialData.profile ?? {};

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <div className="profile-grid">
        <label className="auth-field">
          <span>First name</span>
          <input
            name="first_name"
            defaultValue={initialData.first_name ?? ""}
            placeholder="John"
          />
        </label>
        <label className="auth-field">
          <span>Last name</span>
          <input
            name="last_name"
            defaultValue={initialData.last_name ?? ""}
            placeholder="Doe"
          />
        </label>
        <label className="auth-field">
          <span>Phone</span>
          <input
            name="phone"
            defaultValue={profile.phone ?? ""}
            placeholder="+1 555 123-4567"
          />
        </label>
        <label className="auth-field">
          <span>Shipping address</span>
          <input
            name="default_shipping_address"
            defaultValue={profile.default_shipping_address ?? ""}
            placeholder="123 Main St"
          />
        </label>
        <label className="auth-field">
          <span>City</span>
          <input
            name="default_shipping_city"
            defaultValue={profile.default_shipping_city ?? ""}
            placeholder="New York"
          />
        </label>
        <label className="auth-field">
          <span>Postcode</span>
          <input
            name="default_shipping_postcode"
            defaultValue={profile.default_shipping_postcode ?? ""}
            placeholder="10001"
          />
        </label>
        <label className="auth-field">
          <span>Country</span>
          <input
            name="default_shipping_country"
            defaultValue={profile.default_shipping_country ?? ""}
            placeholder="United States"
          />
        </label>
      </div>
      {message && <p className="profile-success">{message}</p>}
      {error && <p className="auth-error">{error}</p>}
      <button
        className="btn btn-primary auth-submit"
        type="submit"
        disabled={isSaving}
      >
        {isSaving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
