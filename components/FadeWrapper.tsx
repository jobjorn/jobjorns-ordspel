import { ListItem, styled } from '@mui/material';

type FadeWrapperProps = {
  fade: boolean;
};

export const FadeWrapper = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'fade'
})<FadeWrapperProps>((props) => ({
  opacity: props.fade ? 0 : 1,
  transition: 'opacity 1s ease-in-out'
}));
