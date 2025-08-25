import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CompleteSignupForm from "@/components/CompleteSignupForm";
import { TestCampSwitcher } from "@/components/TestCampSwitcher";

function useSEO(title: string, description: string, canonicalPath: string) {
  useEffect(() => {
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = description;
      document.head.appendChild(m);
    }
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${window.location.origin}${canonicalPath}`;
  }, [title, description, canonicalPath]);
}

export default function Signup() {
  useSEO(
    "Sign up | CampRush",
    "Create your CampRush account with complete profile setup.",
    "/signup"
  );
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const handleComplete = (user: any) => {
    // For testing - use a fixed test session ID when sessionId is the literal string
    const testSessionId = sessionId === '{sessionId}' ? '11111111-2222-3333-4444-555555555555' : sessionId;
    navigate(`/sessions/${testSessionId}/signup-submitted`, { replace: true });
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          🧪 Test Environment
        </h2>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
          Switch between different camp scenarios to test various signup flows and payment amounts.
        </p>
        <TestCampSwitcher mode="signup" />
      </div>
      <CompleteSignupForm 
        sessionId={sessionId}
        onComplete={handleComplete}
      />
    </div>
  );
}