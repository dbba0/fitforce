import React from "react";
import Svg, { Rect, Path } from "react-native-svg";

type TrainingLogoProps = {
  size?: number;
  color?: string;
};

export function TrainingLogo({ size = 44, color = "#FFFFFF" }: TrainingLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Rect x={12} y={40} width={18} height={40} rx={6} fill={color} opacity={0.95} />
      <Rect x={32} y={46} width={10} height={28} rx={4} fill={color} opacity={0.85} />
      <Rect x={78} y={46} width={10} height={28} rx={4} fill={color} opacity={0.85} />
      <Rect x={90} y={40} width={18} height={40} rx={6} fill={color} opacity={0.95} />
      <Rect x={42} y={55} width={36} height={10} rx={5} fill={color} />
      <Path
        d="M42 60h10l6-10 7 20 6-10h17"
        stroke="#0D0D0D"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </Svg>
  );
}

