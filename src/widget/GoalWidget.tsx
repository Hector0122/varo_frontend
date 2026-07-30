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

const container = {
  flexDirection: 'column' as const,
  paddingLeft: 16,
  paddingRight: 16,
  paddingTop: 0,
  paddingBottom: 16,
  backgroundColor: '#0f0f23' as const,
  borderRadius: 20,
  width: 'match_parent' as const,
  height: 'match_parent' as const,
  overflow: 'hidden' as const,
};

const accentBar = {
  height: 4,
  backgroundColor: '#f9a825' as const,
  width: 'match_parent' as const,
  marginBottom: 14,
};

const topRow = {
  flexDirection: 'row' as const,
  justifyContent: 'space-between' as const,
  alignItems: 'center' as const,
  width: 'match_parent' as const,
};

const goalName = {
  fontSize: 15,
  fontWeight: '700' as const,
  color: '#ffffff' as const,
  flex: 1,
};

const badge = {
  fontSize: 11,
  fontWeight: '600' as const,
  color: '#0f0f23' as const,
  backgroundColor: '#f9a825' as const,
  paddingLeft: 8,
  paddingRight: 8,
  paddingTop: 3,
  paddingBottom: 3,
  borderRadius: 8,
};

const daysRow = {
  flexDirection: 'row' as const,
  alignItems: 'flex-end' as const,
  marginTop: 12,
};

const daysNumber = {
  fontSize: 44,
  fontWeight: 'bold' as const,
  color: '#f9a825' as const,
};

const daysLabel = {
  fontSize: 15,
  color: '#8888aa' as const,
  marginLeft: 6,
};

const dateText = {
  fontSize: 12,
  color: '#666688' as const,
  marginTop: 4,
};

const progressBg = {
  height: 6,
  backgroundColor: '#1e1e3a' as const,
  borderRadius: 3,
  width: 'match_parent' as const,
  marginTop: 14,
};

export default function GoalWidget({ data }: Props) {
  const days = data.estimatedDays;

  return (
    <FlexWidget style={container}>
      <FlexWidget style={accentBar} />
      <FlexWidget style={topRow}>
        <TextWidget text={data.goalName} maxLines={1} style={goalName} />
        <TextWidget text={`🎯`} style={badge} />
      </FlexWidget>
      <FlexWidget style={daysRow}>
        <TextWidget text={`${days}`} style={daysNumber} />
        <TextWidget text="días restantes" style={daysLabel} />
      </FlexWidget>
      <TextWidget text={data.estimatedDate} style={dateText} />
      <FlexWidget style={progressBg} />
    </FlexWidget>
  );
}

const emptyMessage = {
  fontSize: 13,
  color: '#8888aa' as const,
  marginTop: 12,
};

export function EmptyGoalWidget() {
  return (
    <FlexWidget style={container}>
      <FlexWidget style={accentBar} />
      <FlexWidget style={topRow}>
        <TextWidget text="Varo" maxLines={1} style={goalName} />
        <TextWidget text={`🎯`} style={badge} />
      </FlexWidget>
      <TextWidget text="Sin metas activas" style={emptyMessage} />
    </FlexWidget>
  );
}
