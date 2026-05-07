export function passwordScore(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let score = 1;
  if (pw.length >= 8) score++;
  if (pw.length >= 12 || (/[A-Z]/.test(pw) && /[0-9!@#$%^&*]/.test(pw))) score++;
  return score as 0 | 1 | 2 | 3;
}

const scoreLabel = ["", "Weak", "Fair", "Strong"];
const scoreColor = ["", "bg-destructive", "bg-orange-400", "bg-green-500"];
const scoreFg = ["", "text-destructive", "text-orange-500", "text-green-600"];

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  if (!password) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= score ? scoreColor[score] : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${scoreFg[score]}`}>{scoreLabel[score]}</p>
    </div>
  );
}
