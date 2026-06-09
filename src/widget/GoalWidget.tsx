import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface GoalWidgetData {
  goalName: string;
  estimatedDays: number;
  estimatedDate: string;
}

interface Props {
  data: GoalWidgetData;
}

const containerStyle = {
  flexDirection: 'column' as const,
  justifyContent: 'center' as const,
  paddingLeft: 16,
  paddingRight: 16,
  paddingTop: 12,
  paddingBottom: 12,
  backgroundColor: '#1a1a2e' as const,
  borderRadius: 16,
  width: 'match_parent' as const,
  height: 'match_parent' as const,
};

const goalNameStyle = {
  fontSize: 16,
  fontWeight: '700' as const,
  color: '#ffffff' as const,
};

const daysRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'flex-end' as const,
  width: 'match_parent' as const,
  marginTop: 8,
};

const daysNumberStyle = {
  fontSize: 36,
  fontWeight: 'bold' as const,
  color: '#f9a825' as const,
};

const daysLabelStyle = {
  fontSize: 14,
  color: '#a0a0a0' as const,
  marginLeft: 4,
};

const dateStyle = {
  fontSize: 12,
  color: '#a0a0a0' as const,
  marginTop: 4,
};

export default function GoalWidget({ data }: Props) {
  return (
    <FlexWidget style={containerStyle}>
      <TextWidget text={data.goalName} maxLines={1} style={goalNameStyle} />
      <FlexWidget style={daysRowStyle}>
        <TextWidget text={`${data.estimatedDays}`} style={daysNumberStyle} />
        <TextWidget text=" días" style={daysLabelStyle} />
      </FlexWidget>
      <TextWidget text={data.estimatedDate} style={dateStyle} />
    </FlexWidget>
  );
}
