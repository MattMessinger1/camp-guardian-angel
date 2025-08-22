import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CompleteSignupForm from "@/components/CompleteSignupForm";

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
    navigate(`/sessions/${sessionId}/ready-to-signup`, { replace: true });
  };

  return (
    <CompleteSignupForm 
      sessionId={sessionId}
      onComplete={handleComplete}
    />
  );
}