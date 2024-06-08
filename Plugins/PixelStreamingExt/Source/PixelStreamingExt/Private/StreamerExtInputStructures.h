#pragma once

template <typename ParamOneType>
struct TPayloadOneParam
{
	ParamOneType	Param1;

	TPayloadOneParam(FArchive& Ar)
	{
		Param1 = ParamOneType();
		Ar << Param1;
	}
};

template <typename ParamOneType, typename ParamTwoType, typename ParamThreeType>
struct TPayloadThreeParam
{
	ParamOneType	Param1;
	ParamTwoType	Param2;
	ParamThreeType	Param3;

	TPayloadThreeParam(FArchive& Ar)
	{
		Param1 = ParamOneType();
		Param2 = ParamTwoType();
		Param3 = ParamThreeType();
		Ar << Param1;
		Ar << Param2;
		Ar << Param3;
	}
};

template <typename ParamOneType, typename ParamTwoType, typename ParamThreeType, typename ParamFourType>
struct TPayloadFourParam
{
	ParamOneType	Param1;
	ParamTwoType	Param2;
	ParamThreeType	Param3;
	ParamFourType	Param4;

	TPayloadFourParam(FArchive& Ar)
	{
		Param1 = ParamOneType();
		Param2 = ParamTwoType();
		Param3 = ParamThreeType();
		Param4 = ParamFourType();
		Ar << Param1;
		Ar << Param2;
		Ar << Param3;
		Ar << Param4;
	}
};

template <typename ParamOneType, typename ParamTwoType, typename ParamThreeType, typename ParamFourType, typename ParamFiveType>
struct TPayloadFiveParam
{
	ParamOneType	Param1;
	ParamTwoType	Param2;
	ParamThreeType	Param3;
	ParamFourType	Param4;
	ParamFiveType	Param5;

	TPayloadFiveParam(FArchive& Ar)
	{
		Param1 = ParamOneType();
		Param2 = ParamTwoType();
		Param3 = ParamThreeType();
		Param4 = ParamFourType();
		Param5 = ParamFiveType();
		Ar << Param1;
		Ar << Param2;
		Ar << Param3;
		Ar << Param4;
		Ar << Param5;
	}
};
