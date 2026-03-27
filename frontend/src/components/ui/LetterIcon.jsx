import { useId } from "react";

export const LetterIcon = ({ letter = "A", strike = false }) => {
  const maskId = useId();

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 45 45"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id={maskId}>
          <rect width="45" height="45" fill="white" />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="32"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="800"
            fill="black"
          >
            {letter}
          </text>
        </mask>
      </defs>

      <rect
        x="0"
        y="0"
        width="45"
        height="45"
        rx="7"
        fill="white"
        mask={`url(#${maskId})`}
      />

      {strike && (
        <line
          x1="34"
          y1="8"
          x2="10"
          y2="36"
          stroke="black"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};
