"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEAM_SIZE_OPTIONS = [
  { value: "1", label: "1 (Just me)" },
  { value: "2-5", label: "2–5" },
  { value: "6-15", label: "6–15" },
  { value: "16+", label: "16+" },
];

type FormMode = "sales" | "support";

export function ContactForm() {
  const [mode, setMode] = React.useState<FormMode>("sales");
  const [fullName, setFullName] = React.useState("");
  const [workEmail, setWorkEmail] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [teamSize, setTeamSize] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    
    if (!workEmail.trim()) {
      newErrors.workEmail = "Work email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
      newErrors.workEmail = "Please enter a valid email address";
    }
    
    if (!message.trim()) {
      newErrors.message = "Message is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    const subject = mode === "sales" 
      ? "roducq Sales enquiry" 
      : "roducq Support request";
    
    const body = `Contact form submission:\n\n` +
      `Mode: ${mode}\n` +
      `Full name: ${fullName}\n` +
      `Work email: ${workEmail}\n` +
      `Company: ${company}\n` +
      `Team size: ${teamSize}\n` +
      `Message: ${message}`;
    
    const mailtoUrl = `mailto:hello@roducq.dev?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoUrl;
  };

  return (
    <>
      <div className="flex rounded-lm-control bg-lm-surface-muted p-1">
        <button
          type="button"
          onClick={() => setMode("sales")}
          className={`flex-1 px-4 py-2 text-lm-14 font-lm-semibold rounded-lm-control transition-all ${
            mode === "sales"
              ? "bg-lm-card text-lm-ink shadow-lm-sm"
              : "text-lm-muted-readable hover:text-lm-ink"
          }`}
        >
          Talk to sales
        </button>
        <button
          type="button"
          onClick={() => setMode("support")}
          className={`flex-1 px-4 py-2 text-lm-14 font-lm-semibold rounded-lm-control transition-all ${
            mode === "support"
              ? "bg-lm-card text-lm-ink shadow-lm-sm"
              : "text-lm-muted-readable hover:text-lm-ink"
          }`}
        >
          Get support
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label htmlFor="fullName" className="block text-lm-14 font-lm-medium text-lm-ink">
            Full name <span className="text-lm-accent" aria-hidden="true">*</span>
            <span className="sr-only">required</span>
          </label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) {
                setErrors({...errors, fullName: ""});
              }
            }}
            className="mt-2"
            placeholder=""
            required
            aria-required="true"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
          />
          {errors.fullName && (
            <p id="fullName-error" className="mt-2 text-lm-14 text-lm-accent" role="alert">
              {errors.fullName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="workEmail" className="block text-lm-14 font-lm-medium text-lm-ink">
            Work email <span className="text-lm-accent" aria-hidden="true">*</span>
            <span className="sr-only">required</span>
          </label>
          <Input
            id="workEmail"
            type="email"
            value={workEmail}
            onChange={(e) => {
              setWorkEmail(e.target.value);
              if (errors.workEmail) {
                setErrors({...errors, workEmail: ""});
              }
            }}
            className="mt-2"
            placeholder=""
            required
            aria-required="true"
            aria-invalid={!!errors.workEmail}
            aria-describedby={errors.workEmail ? "workEmail-error" : undefined}
          />
          {errors.workEmail && (
            <p id="workEmail-error" className="mt-2 text-lm-14 text-lm-accent" role="alert">
              {errors.workEmail}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="company" className="block text-lm-14 font-lm-medium text-lm-ink">
            Company
          </label>
          <Input
            id="company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-2"
            placeholder=""
            aria-required="false"
          />
        </div>

        <div>
          <label htmlFor="teamSize" className="block text-lm-14 font-lm-medium text-lm-ink">
            Team size
          </label>
          <Select value={teamSize} onValueChange={setTeamSize}>
            <SelectTrigger id="teamSize" className="mt-2">
              <SelectValue placeholder="Select team size" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="message" className="block text-lm-14 font-lm-medium text-lm-ink">
            What would you like roducq to help with? <span className="text-lm-accent" aria-hidden="true">*</span>
            <span className="sr-only">required</span>
          </label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (errors.message) {
                setErrors({...errors, message: ""});
              }
            }}
            className="mt-2"
            placeholder="A few words about your team and what you're looking for."
            rows={4}
            required
            aria-required="true"
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? "message-error" : undefined}
          />
          {errors.message && (
            <p id="message-error" className="mt-2 text-lm-14 text-lm-accent" role="alert">
              {errors.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full"
          >
            Send to {mode === "sales" ? "sales" : "support"}
          </Button>
          <p className="mt-3 text-center text-lm-12 text-lm-muted-readable">
            Your message opens in your email client.
          </p>
        </div>
      </form>
    </>
  );
}
